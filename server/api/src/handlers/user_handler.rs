use axum::{extract::Path, Json};
use uuid::Uuid;

use crate::{
    app_error::AppError,
    auth::AuthenticatedUserState,
    states::{AssetsServiceState, PortfolioServiceState, UsersServiceState},
    view_models::{add_user_view_model::AddUserViewModel, user_view_model::UserViewModel},
};

#[tracing::instrument(skip_all, ret, err)]
pub async fn post_user(
    UsersServiceState(users_service): UsersServiceState,
    AssetsServiceState(assets_service): AssetsServiceState,
    Json(params): Json<AddUserViewModel>,
) -> Result<Json<UserViewModel>, AppError> {
    let (user, default_account) = users_service.register_user(params.clone().into()).await?;

    let asset = assets_service.get_asset(user.default_asset_id).await?;

    let resp = UserViewModel {
        id: user.id,
        username: user.username,
        default_asset_id: asset.into(),
        portfolio_accounts: vec![default_account.into()],
    };
    Ok(resp.into())
}

#[tracing::instrument(skip(users_service, assets_service, portfolio_service), ret, err)]
pub async fn get_user_by_id(
    Path(user_id): Path<Uuid>,
    AssetsServiceState(assets_service): AssetsServiceState,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
    UsersServiceState(users_service): UsersServiceState,
    AuthenticatedUserState(auth): AuthenticatedUserState,
) -> Result<Json<UserViewModel>, AppError> {
    let (user, portfolio_accounts) = tokio::try_join!(
        users_service.get_full_user(user_id),
        portfolio_service.get_portfolio_accounts(user_id)
    )?;

    let asset = assets_service.get_asset(user.default_asset_id).await?;

    let resp = UserViewModel {
        id: user.id,
        username: user.username,
        default_asset_id: asset.into(),
        portfolio_accounts: portfolio_accounts
            .iter()
            .map(|val| val.clone().into())
            .collect(),
    };
    Ok(resp.into())
}
