use super::infra::SharedInfra;
use crate::api::ai_usage::extract_ai_usage;
use crate::error::{server_error, ApiError};
use crate::models::AiUsage;

pub async fn load_ai_usage(
    infra: &SharedInfra,
    auth_token: Option<&str>,
) -> Result<AiUsage, ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;

    let path = format!("/api/users/{user_id}/ai/usage");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    extract_ai_usage(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}
