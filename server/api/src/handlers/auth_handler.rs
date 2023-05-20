use axum::{
    Json,
};

use crate::app_error::AppError;
use crate::states::{ AuthServiceState};
use crate::view_models::{ auth_view_model::{LoginDetailsViewModel, AuthViewModel}};

#[tracing::instrument(skip_all, ret, err)]
pub async fn post_login_details(
    AuthServiceState(auth_service): AuthServiceState,
    Json(params): Json<LoginDetailsViewModel>,
) -> Result<Json<AuthViewModel>, AppError> {
    let auth = auth_service.get_auth_token(params.username, params.password).await?;
    let retrun_model = AuthViewModel {
        token: auth
    };
    Ok(retrun_model.into())
}