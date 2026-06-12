use std::collections::HashMap;

use shared::view_models::base_models::search::SearchCategoriesResponseViewModel;
use shared::view_models::categories::base_models::category_name::CategoryName;
use shared::view_models::categories::base_models::category_type_id::RequiredCategoryTypeId;
use shared::view_models::categories::base_models::category_type_name::CategoryTypeName;
use shared::view_models::categories::base_models::icon_name::IconName;
use shared::view_models::categories::create_category::CreateCategoryRequestViewModel;
use shared::view_models::categories::create_category_type::CreateCategoryTypeRequestViewModel;
use shared::view_models::categories::get_categories::GetCategoriesResponseViewModel;
use shared::view_models::categories::get_category_types::GetCategoryTypesResponseViewModel;
use shared::view_models::categories::update_category::UpdateCategoryRequestViewModel;
use shared::view_models::categories::update_category_type::UpdateCategoryTypeRequestViewModel;

use crate::error::ApiError;
use crate::models::{CategoryItem, ManagedCategory, ManagedCategoryType};

pub fn extract_categories(body: &str) -> Result<Vec<CategoryItem>, String> {
    let page: SearchCategoriesResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(page
        .results
        .into_iter()
        .filter(|row| !row.category.is_system)
        .map(|row| CategoryItem {
            id: row.id.0,
            name: row.category.category.into_inner(),
            icon: row.category.icon.into_inner(),
        })
        .collect())
}

/// Parse the user's own categories (the `/api/users/{id}/categories` endpoint
/// only returns custom categories — global ones come from `extract_categories`).
/// System categories are dropped for the same reason: they must not be assignable.
pub fn extract_user_categories(body: &str) -> Result<Vec<CategoryItem>, String> {
    let resp: GetCategoriesResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp
        .categories
        .into_iter()
        .filter(|c| !c.category.is_system)
        .map(|c| CategoryItem {
            id: c.id.0,
            name: c.category.category.into_inner(),
            icon: c.category.icon.into_inner(),
        })
        .collect())
}

pub fn extract_managed_categories(
    body: &str,
    type_names: &HashMap<i32, String>,
) -> Result<Vec<ManagedCategory>, String> {
    let resp: GetCategoriesResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp
        .categories
        .into_iter()
        .map(|c| {
            let type_id = c.category.category_type.0;
            ManagedCategory {
                id: c.id.0,
                name: c.category.category.into_inner(),
                icon: c.category.icon.into_inner(),
                category_type_id: type_id,
                type_name: type_names.get(&type_id).cloned().unwrap_or_default(),
                is_global: c.category.is_global,
                is_system: c.category.is_system,
            }
        })
        .collect())
}

pub fn extract_category_types(body: &str) -> Result<Vec<ManagedCategoryType>, String> {
    let resp: GetCategoryTypesResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp
        .category_types
        .into_iter()
        .map(|t| ManagedCategoryType {
            id: t.id.0,
            name: t.category_type.name,
            is_global: t.category_type.is_global,
        })
        .collect())
}

pub fn build_create_category_body(
    name: String,
    icon: String,
    type_id: i32,
) -> Result<String, ApiError> {
    let req = CreateCategoryRequestViewModel {
        category: CategoryName::from_trusted(name),
        icon: IconName::from_trusted(icon),
        category_type_id: RequiredCategoryTypeId(type_id),
    };
    serde_json::to_string(&req).map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })
}

pub fn build_update_category_body(
    name: String,
    icon: String,
    type_id: i32,
) -> Result<String, ApiError> {
    let req = UpdateCategoryRequestViewModel {
        category: CategoryName::from_trusted(name),
        icon: IconName::from_trusted(icon),
        category_type_id: RequiredCategoryTypeId(type_id),
    };
    serde_json::to_string(&req).map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })
}

pub fn build_create_type_body(name: String) -> Result<String, ApiError> {
    let req = CreateCategoryTypeRequestViewModel {
        name: CategoryTypeName::from_trusted(name),
    };
    serde_json::to_string(&req).map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })
}

pub fn build_update_type_body(name: String) -> Result<String, ApiError> {
    let req = UpdateCategoryTypeRequestViewModel {
        name: CategoryTypeName::from_trusted(name),
    };
    serde_json::to_string(&req).map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_categories_drops_system_categories() {
        let body = r#"{
            "results": [
                {"id": 25, "category": "Groceries", "icon": "shopping-cart",
                 "category_type": 2, "is_global": true, "is_system": false},
                {"id": 1, "category": "Exchange Fees", "icon": "money_off",
                 "category_type": 9, "is_global": true, "is_system": true}
            ],
            "total_results": 2,
            "lookup_tables": {"category_types": []}
        }"#;
        let cats = extract_categories(body).unwrap();
        assert_eq!(cats.len(), 1);
        assert_eq!(cats[0].id, 25);
        assert_eq!(cats[0].name, "Groceries");
    }

    #[test]
    fn extract_user_categories_maps_and_drops_system() {
        let body = r#"{
            "categories": [
                {"id": 50, "category": "Side Hustle", "icon": "briefcase",
                 "category_type": 3, "is_global": false, "is_system": false},
                {"id": 1, "category": "Exchange Fees", "icon": "money_off",
                 "category_type": 9, "is_global": true, "is_system": true}
            ],
            "lookup_tables": {"category_types": []}
        }"#;
        let cats = extract_user_categories(body).unwrap();
        assert_eq!(cats.len(), 1);
        assert_eq!(cats[0].id, 50);
        assert_eq!(cats[0].name, "Side Hustle");
        assert_eq!(cats[0].icon, "briefcase");
    }

    #[test]
    fn extracts_categories_with_resolved_type_names() {
        let body = r#"{
            "categories": [
                {"id": 25, "category": "Groceries", "icon": "shopping-cart",
                 "category_type": 2, "is_global": true, "is_system": false},
                {"id": 1, "category": "Exchange Fees", "icon": "money_off",
                 "category_type": 9, "is_global": true, "is_system": true}
            ],
            "lookup_tables": {"category_types": []}
        }"#;
        let mut names = std::collections::HashMap::new();
        names.insert(2, "Shopping".to_string());
        names.insert(9, "Fees".to_string());

        let cats = extract_managed_categories(body, &names).unwrap();
        assert_eq!(cats.len(), 2);
        assert_eq!(cats[0].id, 25);
        assert_eq!(cats[0].name, "Groceries");
        assert_eq!(cats[0].icon, "shopping-cart");
        assert_eq!(cats[0].category_type_id, 2);
        assert_eq!(cats[0].type_name, "Shopping");
        assert!(cats[0].is_global);
        assert!(!cats[0].is_system);
        assert_eq!(cats[1].type_name, "Fees");
        assert!(cats[1].is_system);
    }

    #[test]
    fn extracts_category_types() {
        let body = r#"{"category_types": [
            {"id": 2, "name": "Shopping", "is_global": false},
            {"id": 9, "name": "Fees", "is_global": true}
        ]}"#;
        let types = extract_category_types(body).unwrap();
        assert_eq!(types.len(), 2);
        assert_eq!(types[0].id, 2);
        assert_eq!(types[0].name, "Shopping");
        assert!(!types[0].is_global);
        assert!(types[1].is_global);
    }

    #[test]
    fn builds_create_category_body() {
        let body =
            build_create_category_body("Groceries".into(), "shopping-cart".into(), 2).unwrap();
        let v: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(v["category"], "Groceries");
        assert_eq!(v["icon"], "shopping-cart");
        assert_eq!(v["category_type_id"], 2);
    }

    #[test]
    fn builds_create_type_body() {
        let body = build_create_type_body("Travel".into()).unwrap();
        let v: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(v["name"], "Travel");
    }
}
