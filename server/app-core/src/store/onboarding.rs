use super::infra::SharedInfra;
use crate::error::ApiError;

pub async fn set_onboarding_version(
    infra: &SharedInfra,
    version: i32,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let body = serde_json::json!({ "version": version }).to_string();
    let path = format!("/api/users/{user_id}/onboarding");
    let resp = infra.post(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(crate::error::server_error(resp.status, &resp.body));
    }
    infra.set_onboarding_version(version);
    Ok(())
}
