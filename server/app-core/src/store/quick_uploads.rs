use std::collections::HashSet;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

use crate::api::quick_upload;
use crate::error::ApiError;
use crate::models::{QuickUploadDetail, QuickUploadsState, UnifiedQuickUploadItem};

use super::infra::SharedInfra;
use super::sse;

#[uniffi::export(callback_interface)]
pub trait QuickUploadsObserver: Send + Sync {
    fn on_quick_uploads_changed(&self, state: QuickUploadsState);
}

pub struct QuickUploadsModule {
    state: QuickUploadsState,
    observer: Option<Box<dyn QuickUploadsObserver>>,
    sse_subscriptions: HashSet<String>,
    cancelled: Arc<AtomicBool>,
}

impl QuickUploadsModule {
    pub fn new() -> Self {
        Self {
            state: QuickUploadsState { items: vec![] },
            observer: None,
            sse_subscriptions: HashSet::new(),
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn set_observer(&mut self, observer: Box<dyn QuickUploadsObserver>) {
        tracing::debug!("QuickUploads: set_observer, current items={}", self.state.items.len());
        self.observer = Some(observer);
        self.notify();
    }

    pub fn clear_observer(&mut self) {
        self.observer = None;
    }

    pub fn clear_state(&mut self) {
        self.cancelled.store(true, std::sync::atomic::Ordering::Relaxed);
        self.cancelled = Arc::new(AtomicBool::new(false));
        self.state = QuickUploadsState { items: vec![] };
        self.sse_subscriptions.clear();
        self.notify();
    }

    pub fn cancelled(&self) -> Arc<AtomicBool> {
        self.cancelled.clone()
    }

    fn notify(&self) {
        let count = self.state.items.len();
        let statuses: Vec<&str> = self.state.items.iter().map(|i| i.status.as_str()).collect();
        tracing::debug!("QuickUploads: notify {} items, statuses={:?}, has_observer={}", count, statuses, self.observer.is_some());
        if let Some(ref obs) = self.observer {
            obs.on_quick_uploads_changed(self.state.clone());
        }
    }

    fn has_sse(&self, upload_id: &str) -> bool {
        self.sse_subscriptions.contains(upload_id)
    }

    fn add_sse(&mut self, upload_id: &str) {
        self.sse_subscriptions.insert(upload_id.to_string());
    }

    fn remove_sse(&mut self, upload_id: &str) {
        self.sse_subscriptions.remove(upload_id);
    }
}

// ── Public functions ─────────────────────────────────────────────────────────

pub fn queue_quick_upload(
    infra: &Arc<SharedInfra>,
    module: &Arc<Mutex<QuickUploadsModule>>,
    image_data: Vec<u8>,
    thumbnail: Vec<u8>,
    mime_type: String,
) {
    let conn =
        rusqlite::Connection::open(&infra.db_path).expect("failed to open db for quick_upload");
    let thumb = if thumbnail.is_empty() {
        None
    } else {
        Some(thumbnail.as_slice())
    };
    quick_upload::insert(&conn, &image_data, thumb, &mime_type);
    refresh_local_state(infra, module);
}

pub async fn flush_and_subscribe(
    infra: &Arc<SharedInfra>,
    module: &Arc<Mutex<QuickUploadsModule>>,
    auth_token: Option<&str>,
) {
    tracing::info!("QuickUploads: flush_and_subscribe called, connectivity={}", infra.has_connectivity());
    if !infra.has_connectivity() {
        tracing::info!("QuickUploads: no connectivity, skipping flush");
        return;
    }

    let user_id = match infra.user_id() {
        Some(id) => id,
        None => {
            tracing::info!("QuickUploads: no user_id, skipping flush");
            return;
        }
    };

    let conn =
        rusqlite::Connection::open(&infra.db_path).expect("failed to open db for quick_upload");
    let flushable = quick_upload::get_flushable(&conn);

    tracing::info!("QuickUploads: {} flushable items", flushable.len());
    for (local_id, image_data, mime_type) in flushable {
        tracing::info!("QuickUploads: flushing {} ({} bytes, {})", local_id, image_data.len(), mime_type);
        quick_upload::update_status(&conn, &local_id, "uploading");
        refresh_local_state(infra, module);

        match upload_single(infra, &user_id, &image_data, &mime_type, auth_token).await {
            Ok(server_id) => {
                tracing::info!("QuickUploads: uploaded {} -> server_id={}", local_id, server_id);
                quick_upload::set_server_id_and_delete(&conn, &local_id, &server_id);
            }
            Err((error, permanent)) => {
                tracing::error!("QuickUploads: upload failed for {}: {} (permanent={})", local_id, error, permanent);
                quick_upload::mark_failed(&conn, &local_id, &error, permanent);
                refresh_local_state(infra, module);
            }
        }
    }

    tracing::info!("QuickUploads: flush done, calling fetch_and_update");
    fetch_and_update(infra, module, auth_token).await;
    subscribe_processing_items(infra, module, &user_id, auth_token).await;
}

pub async fn fetch_and_update(
    infra: &Arc<SharedInfra>,
    module: &Arc<Mutex<QuickUploadsModule>>,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(id) => id,
        None => return,
    };

    let conn =
        rusqlite::Connection::open(&infra.db_path).expect("failed to open db for quick_upload");
    let local_items = quick_upload::get_all_active(&conn);

    let path = format!("/api/users/{}/ai/quick-upload", user_id);
    infra.evict_memory_cache(&path);
    let server_resp = infra.get(&path, auth_token).await;
    let server_items: Vec<ServerQuickUploadItem> = match &server_resp {
        Ok(resp) if resp.status == 200 => {
            tracing::info!("QuickUploads: fetch_and_update server response: {} bytes", resp.body.len());
            match serde_json::from_str(&resp.body) {
                Ok(items) => items,
                Err(e) => {
                    tracing::error!("QuickUploads: failed to parse server items: {}, body={}", e, &resp.body[..resp.body.len().min(200)]);
                    vec![]
                }
            }
        }
        Ok(resp) => {
            tracing::warn!("QuickUploads: server returned status {}", resp.status);
            vec![]
        }
        Err(e) => {
            tracing::error!("QuickUploads: server fetch failed: {}", e);
            vec![]
        }
    };

    tracing::info!("QuickUploads: fetch_and_update: {} local, {} server items", local_items.len(), server_items.len());

    let mut unified: Vec<UnifiedQuickUploadItem> = Vec::new();

    // Add local items
    for item in &local_items {
        unified.push(UnifiedQuickUploadItem {
            id: item.local_id.clone(),
            status: item.status.clone(),
            proposal_type: None,
            proposal_data: None,
            error_message: item.error_message.clone(),
            thumbnail: item.thumbnail.clone(),
            created_at: item.created_at,
        });
    }

    // Add server items
    for item in &server_items {
        unified.push(UnifiedQuickUploadItem {
            id: item.id.clone(),
            status: item.status.clone(),
            proposal_type: item.proposal_type.clone(),
            proposal_data: item.proposal_data.as_ref().map(|v| v.to_string()),
            error_message: None,
            thumbnail: None,
            created_at: parse_rfc3339_to_epoch(&item.created_at).unwrap_or(0),
        });
    }

    // Sort by created_at descending
    unified.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    let mut lock = module.lock().unwrap();
    lock.state = QuickUploadsState { items: unified };
    lock.notify();
}

pub async fn subscribe_processing_items(
    infra: &Arc<SharedInfra>,
    module: &Arc<Mutex<QuickUploadsModule>>,
    user_id: &str,
    auth_token: Option<&str>,
) {
    let items_to_subscribe: Vec<String> = {
        let lock = module.lock().unwrap();
        lock.state
            .items
            .iter()
            .filter(|item| {
                matches!(
                    item.status.as_str(),
                    "pending" | "created" | "processing"
                ) && !lock.has_sse(&item.id)
            })
            .map(|item| item.id.clone())
            .collect()
    };

    let cancelled = {
        module.lock().unwrap().cancelled()
    };

    for upload_id in items_to_subscribe {
        {
            let mut lock = module.lock().unwrap();
            lock.add_sse(&upload_id);
        }

        let infra_clone = Arc::clone(infra);
        let module_clone = Arc::clone(module);
        let uid = user_id.to_string();
        let token = auth_token.map(|s| s.to_string());
        let uid_for_sse = upload_id.clone();
        let cancelled = cancelled.clone();

        tokio::spawn(async move {
            let mut rx = sse::subscribe_sse(
                &infra_clone.http,
                &infra_clone.base_url,
                &uid,
                &uid_for_sse,
                token.as_deref(),
            )
            .await;

            while let Some(event) = rx.recv().await {
                if cancelled.load(std::sync::atomic::Ordering::Relaxed) {
                    break;
                }
                match event {
                    sse::SseEvent::Proposal | sse::SseEvent::Done | sse::SseEvent::Error { .. } => {
                        {
                            let mut lock = module_clone.lock().unwrap();
                            lock.remove_sse(&uid_for_sse);
                        }
                        fetch_and_update(&infra_clone, &module_clone, token.as_deref()).await;
                        break;
                    }
                    sse::SseEvent::State { .. } => {}
                }
            }
        });
    }
}

pub async fn dismiss_quick_upload(
    infra: &Arc<SharedInfra>,
    module: &Arc<Mutex<QuickUploadsModule>>,
    id: &str,
    auth_token: Option<&str>,
) {
    let conn =
        rusqlite::Connection::open(&infra.db_path).expect("failed to open db for quick_upload");
    let deleted = quick_upload::delete(&conn, id);

    if deleted {
        refresh_local_state(infra, module);
        return;
    }

    // Server-side dismiss
    let user_id = match infra.user_id() {
        Some(uid) => uid,
        None => return,
    };

    let path = format!("/api/users/{}/ai/quick-upload/{}/complete", user_id, id);
    let body = r#"{"accepted":false}"#;
    let _ = infra.post(&path, body, auth_token).await;

    {
        let mut lock = module.lock().unwrap();
        lock.remove_sse(id);
    }

    fetch_and_update(infra, module, auth_token).await;
}

pub async fn complete_quick_upload(
    infra: &Arc<SharedInfra>,
    module: &Arc<Mutex<QuickUploadsModule>>,
    upload_id: &str,
    accepted: bool,
    auth_token: Option<&str>,
) {
    let user_id = match infra.user_id() {
        Some(uid) => uid,
        None => return,
    };

    let path = format!(
        "/api/users/{}/ai/quick-upload/{}/complete",
        user_id, upload_id
    );
    let body = format!(r#"{{"accepted":{}}}"#, accepted);
    let _ = infra.post(&path, &body, auth_token).await;

    {
        let mut lock = module.lock().unwrap();
        lock.remove_sse(upload_id);
    }

    fetch_and_update(infra, module, auth_token).await;
}

pub async fn get_quick_upload_detail(
    infra: &Arc<SharedInfra>,
    upload_id: &str,
    auth_token: Option<&str>,
) -> Result<QuickUploadDetail, ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Network {
        reason: "no user_id".into(),
    })?;

    let path = format!("/api/users/{}/ai/quick-upload/{}", user_id, upload_id);
    infra.evict_memory_cache(&path);

    let resp = infra.get(&path, auth_token).await?;

    let detail: ServerQuickUploadDetail =
        serde_json::from_str(&resp.body).map_err(|e| ApiError::Parse {
            reason: e.to_string(),
        })?;

    Ok(QuickUploadDetail {
        status: detail.status,
        source_file_id: detail.source_file_id,
        proposal_type: detail.proposal_type,
        proposal_data: detail.proposal_data.as_ref().map(|v| v.to_string()),
        created_at: parse_rfc3339_to_epoch(&detail.created_at).unwrap_or(0),
        updated_at: parse_rfc3339_to_epoch(&detail.updated_at).unwrap_or(0),
        lookup_tables: detail.lookup_tables.map(|v| v.to_string()).unwrap_or_default(),
    })
}

pub async fn send_quick_upload_correction(
    infra: &Arc<SharedInfra>,
    module: &Arc<Mutex<QuickUploadsModule>>,
    upload_id: &str,
    message: &str,
    auth_token: Option<&str>,
) -> Result<QuickUploadDetail, ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Network {
        reason: "no user_id".into(),
    })?;

    let path = format!(
        "/api/users/{}/ai/quick-upload/{}/message",
        user_id, upload_id
    );
    let body = serde_json::json!({ "message": message }).to_string();
    infra.post(&path, &body, auth_token).await?;

    {
        let mut lock = module.lock().unwrap();
        lock.add_sse(upload_id);
    }

    // Subscribe to SSE for the result
    let mut rx = sse::subscribe_sse(
        &infra.http,
        &infra.base_url,
        &user_id,
        upload_id,
        auth_token,
    )
    .await;

    while let Some(event) = rx.recv().await {
        match event {
            sse::SseEvent::Proposal | sse::SseEvent::Done => {
                {
                    let mut lock = module.lock().unwrap();
                    lock.remove_sse(upload_id);
                }
                fetch_and_update(infra, module, auth_token).await;
                return get_quick_upload_detail(infra, upload_id, auth_token).await;
            }
            sse::SseEvent::Error { message: msg } => {
                {
                    let mut lock = module.lock().unwrap();
                    lock.remove_sse(upload_id);
                }
                fetch_and_update(infra, module, auth_token).await;
                return Err(ApiError::Server {
                    reason: msg,
                    status: 500,
                });
            }
            sse::SseEvent::State { .. } => {}
        }
    }

    // If SSE stream ended without a terminal event, fetch current state
    fetch_and_update(infra, module, auth_token).await;
    get_quick_upload_detail(infra, upload_id, auth_token).await
}

// ── Private helpers ──────────────────────────────────────────────────────────

async fn upload_single(
    infra: &SharedInfra,
    user_id: &str,
    image_data: &[u8],
    mime_type: &str,
    auth_token: Option<&str>,
) -> Result<String, (String, bool)> {
    // Step 1: Create file record → get presigned upload URL
    let create_body = serde_json::json!({
        "original_name": "upload",
        "mime_type": mime_type,
        "size_bytes": image_data.len(),
    });
    let create_resp = infra
        .post(
            &format!("/api/users/{}/files", user_id),
            &create_body.to_string(),
            auth_token,
        )
        .await
        .map_err(|e| (e.to_string(), false))?;

    if !(200..300).contains(&create_resp.status) {
        let permanent = (400..500).contains(&create_resp.status) && create_resp.status != 429;
        return Err((create_resp.body, permanent));
    }

    let file_resp: serde_json::Value =
        serde_json::from_str(&create_resp.body).map_err(|e| (e.to_string(), false))?;
    let file_id = file_resp["id"]
        .as_str()
        .ok_or_else(|| ("missing file id".to_string(), true))?;
    let upload_meta = &file_resp["upload_metadata"];
    let upload_url = upload_meta["upload_url"]
        .as_str()
        .ok_or_else(|| ("missing upload_url".to_string(), true))?;
    let upload_method = upload_meta["upload_method"]
        .as_str()
        .unwrap_or("PUT");

    // Step 2: Upload file bytes to presigned URL
    let method = upload_method.parse::<reqwest::Method>().unwrap_or(reqwest::Method::PUT);
    let mut upload_req = infra.http.request(method, upload_url)
        .body(image_data.to_vec());

    if let Some(headers) = upload_meta["upload_headers"].as_object() {
        for (key, value) in headers {
            if let Some(v) = value.as_str() {
                upload_req = upload_req.header(key.as_str(), v);
            }
        }
    }

    let upload_resp = upload_req
        .send()
        .await
        .map_err(|e| (format!("upload to storage failed: {}", e), false))?;

    if !upload_resp.status().is_success() {
        let status = upload_resp.status().as_u16();
        let body = upload_resp.text().await.unwrap_or_default();
        return Err((format!("storage upload HTTP {}: {}", status, body), false));
    }

    // Step 3: Confirm file upload
    let confirm_resp = infra
        .post(
            &format!("/api/users/{}/files/{}/confirm", user_id, file_id),
            "{}",
            auth_token,
        )
        .await
        .map_err(|e| (e.to_string(), false))?;

    if !(200..300).contains(&confirm_resp.status) {
        return Err((format!("confirm failed: {}", confirm_resp.body), false));
    }

    // Step 4: Create quick upload with file_id
    let qu_body = serde_json::json!({ "file_id": file_id });
    let qu_resp = infra
        .post(
            &format!("/api/users/{}/ai/quick-upload", user_id),
            &qu_body.to_string(),
            auth_token,
        )
        .await
        .map_err(|e| (e.to_string(), false))?;

    if (200..300).contains(&qu_resp.status) {
        let id = serde_json::from_str::<serde_json::Value>(&qu_resp.body)
            .ok()
            .and_then(|v| v["id"].as_str().map(|s| s.to_string()))
            .unwrap_or_default();
        Ok(id)
    } else if (400..500).contains(&qu_resp.status) && qu_resp.status != 429 {
        Err((qu_resp.body, true))
    } else {
        Err((format!("HTTP {}: {}", qu_resp.status, qu_resp.body), false))
    }
}

fn parse_rfc3339_to_epoch(s: &str) -> Option<i64> {
    time::OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339)
        .ok()
        .map(|dt| dt.unix_timestamp())
}

fn refresh_local_state(infra: &SharedInfra, module: &Mutex<QuickUploadsModule>) {
    let conn =
        rusqlite::Connection::open(&infra.db_path).expect("failed to open db for quick_upload");
    let local_items = quick_upload::get_all_active(&conn);

    let mut lock = module.lock().unwrap();

    // Keep server items from current state (those without local statuses)
    let server_items: Vec<UnifiedQuickUploadItem> = lock
        .state
        .items
        .iter()
        .filter(|item| {
            !matches!(
                item.status.as_str(),
                "queued" | "uploading" | "failed"
            )
        })
        .cloned()
        .collect();

    let mut unified: Vec<UnifiedQuickUploadItem> = Vec::new();

    for item in &local_items {
        unified.push(UnifiedQuickUploadItem {
            id: item.local_id.clone(),
            status: item.status.clone(),
            proposal_type: None,
            proposal_data: None,
            error_message: item.error_message.clone(),
            thumbnail: item.thumbnail.clone(),
            created_at: item.created_at,
        });
    }

    unified.extend(server_items);
    unified.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    lock.state = QuickUploadsState { items: unified };
    lock.notify();
}

// ── Server response types ────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct ServerQuickUploadItem {
    id: String,
    status: String,
    #[serde(default)]
    proposal_type: Option<String>,
    #[serde(default)]
    proposal_data: Option<serde_json::Value>,
    created_at: String,
}

#[derive(serde::Deserialize)]
struct ServerQuickUploadDetail {
    status: String,
    source_file_id: String,
    #[serde(default)]
    proposal_type: Option<String>,
    #[serde(default)]
    proposal_data: Option<serde_json::Value>,
    created_at: String,
    updated_at: String,
    #[serde(default)]
    lookup_tables: Option<serde_json::Value>,
}
