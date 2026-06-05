use std::collections::HashMap;
use std::sync::Mutex;

use super::infra::SharedInfra;
use crate::api::categories::{
    build_create_category_body, build_create_type_body, build_update_category_body,
    build_update_type_body, extract_category_types, extract_managed_categories, server_error,
};
use crate::error::ApiError;
use crate::models::CategoriesState;

#[uniffi::export(callback_interface)]
pub trait CategoriesObserver: Send + Sync {
    fn on_categories_changed(&self, state: CategoriesState);
}

pub struct CategoriesModule {
    state: CategoriesState,
    observer: Option<Box<dyn CategoriesObserver>>,
}

impl CategoriesModule {
    pub fn new() -> Self {
        Self {
            state: CategoriesState {
                is_loading: false,
                error: None,
                categories: vec![],
                types: vec![],
            },
            observer: None,
        }
    }

    pub fn set_observer(&mut self, observer: Box<dyn CategoriesObserver>) {
        self.observer = Some(observer);
        self.notify();
    }

    pub fn clear_observer(&mut self) {
        self.observer = None;
    }

    pub fn clear_state(&mut self) {
        self.state = CategoriesState {
            is_loading: false,
            error: None,
            categories: vec![],
            types: vec![],
        };
        self.notify();
    }

    fn notify(&self) {
        if let Some(ref obs) = self.observer {
            obs.on_categories_changed(self.state.clone());
        }
    }
}

pub async fn load_categories(
    infra: &SharedInfra,
    module: &Mutex<CategoriesModule>,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    {
        let mut m = module.lock().unwrap();
        m.state.is_loading = true;
        m.notify();
    }

    let types_path = format!("/api/users/{user_id}/categories/types");
    let types = match infra.get(&types_path, auth_token).await {
        Ok(resp) => match extract_category_types(&resp.body) {
            Ok(t) => t,
            Err(e) => return fail(module, e),
        },
        Err(e) => return fail(module, e.to_string()),
    };

    let type_names: HashMap<i32, String> = types.iter().map(|t| (t.id, t.name.clone())).collect();

    let cats_path = format!("/api/users/{user_id}/categories");
    let categories = match infra.get(&cats_path, auth_token).await {
        Ok(resp) => match extract_managed_categories(&resp.body, &type_names) {
            Ok(c) => c,
            Err(e) => return fail(module, e),
        },
        Err(e) => return fail(module, e.to_string()),
    };

    let mut m = module.lock().unwrap();
    m.state.categories = categories;
    m.state.types = types;
    m.state.error = None;
    m.state.is_loading = false;
    m.notify();
}

fn fail(module: &Mutex<CategoriesModule>, error: String) {
    let mut m = module.lock().unwrap();
    m.state.error = Some(error);
    m.state.is_loading = false;
    m.notify();
}

pub async fn refresh_categories(
    infra: &SharedInfra,
    module: &Mutex<CategoriesModule>,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };
    infra.evict_memory_cache_prefix(&format!("/api/users/{user_id}/categories"));
    load_categories(infra, module, auth_token).await;
}

async fn reload_after_write(
    infra: &SharedInfra,
    module: &Mutex<CategoriesModule>,
    auth_token: Option<&str>,
    user_id: &str,
) {
    infra.evict_memory_cache_prefix(&format!("/api/users/{user_id}/categories"));
    load_categories(infra, module, auth_token).await;
}

pub async fn create_category(
    infra: &SharedInfra,
    module: &Mutex<CategoriesModule>,
    name: String,
    icon: String,
    type_id: i32,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let body = build_create_category_body(name, icon, type_id)?;
    let path = format!("/api/users/{user_id}/categories");
    let resp = infra.post(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    reload_after_write(infra, module, auth_token, &user_id).await;
    Ok(())
}

pub async fn update_category(
    infra: &SharedInfra,
    module: &Mutex<CategoriesModule>,
    id: i32,
    name: String,
    icon: String,
    type_id: i32,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let body = build_update_category_body(name, icon, type_id)?;
    let path = format!("/api/users/{user_id}/categories/{id}");
    let resp = infra.put(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    reload_after_write(infra, module, auth_token, &user_id).await;
    Ok(())
}

pub async fn delete_category(
    infra: &SharedInfra,
    module: &Mutex<CategoriesModule>,
    id: i32,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let path = format!("/api/users/{user_id}/categories/{id}");
    let resp = infra.delete(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    reload_after_write(infra, module, auth_token, &user_id).await;
    Ok(())
}

pub async fn create_category_type(
    infra: &SharedInfra,
    module: &Mutex<CategoriesModule>,
    name: String,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let body = build_create_type_body(name)?;
    let path = format!("/api/users/{user_id}/categories/types");
    let resp = infra.post(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    reload_after_write(infra, module, auth_token, &user_id).await;
    Ok(())
}

pub async fn update_category_type(
    infra: &SharedInfra,
    module: &Mutex<CategoriesModule>,
    id: i32,
    name: String,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let body = build_update_type_body(name)?;
    let path = format!("/api/users/{user_id}/categories/types/{id}");
    let resp = infra.put(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    reload_after_write(infra, module, auth_token, &user_id).await;
    Ok(())
}

pub async fn delete_category_type(
    infra: &SharedInfra,
    module: &Mutex<CategoriesModule>,
    id: i32,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let path = format!("/api/users/{user_id}/categories/types/{id}");
    let resp = infra.delete(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    reload_after_write(infra, module, auth_token, &user_id).await;
    Ok(())
}
