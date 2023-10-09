use axum::{extract::Path, Json};
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    states::{AssetsServiceState, PortfolioServiceState, UsersServiceState},
    view_models::{add_user_view_model::AddUserViewModel, user_view_model::UserViewModel},
};

#[tracing::instrument(skip_all, err)]
pub async fn post_user(
    UsersServiceState(users_service): UsersServiceState,
    AssetsServiceState(assets_service): AssetsServiceState,
    Json(params): Json<AddUserViewModel>,
) -> Result<Json<UserViewModel>, ApiError> {
    let (user, default_account) = users_service.register_user(params.clone().into()).await?;

    let asset = assets_service.get_asset(user.default_asset_id).await?;

    let resp = UserViewModel {
        id: user.id,
        username: user.username,
        default_asset_id: asset.into(),
        portfolio_accounts: vec![default_account.into()],
        custom_assets: vec![],
    };
    Ok(resp.into())
}

#[tracing::instrument(skip_all, err)]
pub async fn get_user_by_id(
    Path(user_id): Path<Uuid>,
    AssetsServiceState(assets_service): AssetsServiceState,
    PortfolioServiceState(portfolio_service): PortfolioServiceState,
    UsersServiceState(users_service): UsersServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<UserViewModel>, ApiError> {
    let (user, portfolio_accounts) = tokio::try_join!(
        users_service.get_full_user(user_id),
        portfolio_service.get_portfolio_accounts(user_id)
    )?;

    let asset = assets_service.get_asset(user.default_asset_id).await?;
    let custom_assets = assets_service.get_all_user_assets(user_id).await?;

    let resp = UserViewModel {
        id: user.id,
        username: user.username,
        default_asset_id: asset.into(),
        portfolio_accounts: portfolio_accounts
            .into_iter()
            .map(|val| val.into())
            .collect(),
        custom_assets: custom_assets.into_iter().map(|val| val.into()).collect(),
    };
    Ok(resp.into())
}
