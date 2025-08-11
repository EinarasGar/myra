use axum::Json;

use crate::errors::ApiError;
use crate::states::AuthServiceState;
use crate::view_models::authentication::auth::AuthViewModel;
use crate::view_models::authentication::login_details::LoginDetailsViewModel;
use crate::view_models::errors::AuthResponses;

/// Authenticate
///
/// Posting login details to this query will return an authentication token used in most of the requests.
#[utoipa::path(
    post,
    path = "/api/auth",
    tag = "Authentication",
    request_body (
      content = LoginDetailsViewModel,
    ),
    responses(
        (status = 200, description = "Authentication successful.", body = AuthViewModel),
        AuthResponses
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn post_login_details(
    AuthServiceState(auth_service): AuthServiceState,
    Json(params): Json<LoginDetailsViewModel>,
) -> Result<Json<AuthViewModel>, ApiError> {
    let auth = auth_service
        .get_auth_token(params.username, params.password)
        .await?;
    let return_model = AuthViewModel { token: auth };
    Ok(return_model.into())
}
