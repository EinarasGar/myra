use axum::Json;

use crate::{
    auth::AuthenticatedUserId, errors::ApiError, states::AiUsageServiceState,
    view_models::ai::usage::AiUsageResponseViewModel,
};

#[utoipa::path(
    get,
    path = "/api/users/{user_id}/ai/usage",
    tag = "AI",
    responses(
        (status = 200, description = "Current AI token usage and limits for the user.", body = AiUsageResponseViewModel),
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
    ),
    security(("auth_token" = []))
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id))]
pub async fn get_usage(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    AiUsageServiceState(service): AiUsageServiceState,
) -> Result<Json<AiUsageResponseViewModel>, ApiError> {
    let dto = service
        .get_usage(user_id)
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok(Json(dto.into()))
}
