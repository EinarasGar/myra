use serde::Deserialize;

use super::infra::SharedInfra;
use crate::api::exports::{extract_export, extract_exports, format_body};
use crate::error::{server_error, ApiError};
use crate::models::{ExportFormat, LedgerExport};

pub async fn create_export(
    infra: &SharedInfra,
    format: ExportFormat,
    auth_token: Option<&str>,
) -> Result<LedgerExport, ApiError> {
    let user_id = require_user_id(infra)?;
    let path = format!("/api/users/{user_id}/exports");
    let resp = infra.post(&path, &format_body(format), auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    extract_export(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn list_exports(
    infra: &SharedInfra,
    auth_token: Option<&str>,
) -> Result<Vec<LedgerExport>, ApiError> {
    let user_id = require_user_id(infra)?;
    let path = format!("/api/users/{user_id}/exports");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    extract_exports(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn export_download_url(
    infra: &SharedInfra,
    file_id: &str,
    auth_token: Option<&str>,
) -> Result<String, ApiError> {
    let user_id = require_user_id(infra)?;
    let path = format!("/api/users/{user_id}/files/{file_id}/url");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    let parsed: FileUrlResponse =
        serde_json::from_str(&resp.body).map_err(|e| ApiError::Parse {
            reason: e.to_string(),
        })?;
    Ok(parsed.url)
}

#[derive(Deserialize)]
struct FileUrlResponse {
    url: String,
}

fn require_user_id(infra: &SharedInfra) -> Result<String, ApiError> {
    infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })
}
