use axum::Json;

use crate::errors::ApiError;
use crate::states::AuthServiceState;
use crate::view_models::auth_view_model::AuthViewModel;
use crate::view_models::login_details_view_model::LoginDetailsViewModel;

#[tracing::instrument(skip_all, err)]
pub async fn post_login_details(
    AuthServiceState(auth_service): AuthServiceState,
    Json(params): Json<LoginDetailsViewModel>,
) -> Result<Json<AuthViewModel>, ApiError> {
    let auth = auth_service
        .get_auth_token(params.username, params.password)
        .await?;
    let retrun_model = AuthViewModel { token: auth };
    Ok(retrun_model.into())
}
