use axum::{
    extract::{Path, Query},
    Json,
};
use business::dtos::{add_custom_asset_dto::AddCustomAssetDto, asset_dto::AssetDto};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::{auth::AuthError, ApiError},
    states::AssetsServiceState,
    view_models::{
        add_asset_rate_view_model::AddAssetRateViewModel, add_asset_view_model::AddAssetViewModel,
        asset_pair_view_model::AssetPairViewModel, asset_view_model::AssetViewModel,
    },
};

#[derive(Deserialize, Debug)]
pub struct GetAssetsQueryParams {
    page: Option<u64>,
    search: Option<String>,
}

#[tracing::instrument(skip_all, err)]
pub async fn get_assets(
    AssetsServiceState(assets_service): AssetsServiceState,
    query_params: Query<GetAssetsQueryParams>,
) -> Result<Json<Vec<AssetViewModel>>, ApiError> {
    let page = query_params.page.unwrap_or_default();

    let assets_vec = assets_service
        .get_public_assets(page, query_params.search.clone())
        .await?;

    let ret_vec: Vec<AssetViewModel> = assets_vec.iter().map(|val| val.clone().into()).collect();

    Ok(ret_vec.into())
}

#[tracing::instrument(skip_all, err)]
pub async fn get_asset_by_id(
    Path(id): Path<i32>,
    AssetsServiceState(assets_service): AssetsServiceState,
) -> Result<Json<AssetViewModel>, ApiError> {
    let asset = assets_service.get_asset(id).await?;
    if asset.owner.is_some() {
        return Err(AuthError::Unauthorized.into());
    }
    let ret: AssetViewModel = asset.into();
    Ok(ret.into())
}

#[tracing::instrument(skip_all, err)]
pub async fn get_asset_pair(
    Path((pair1, pair2)): Path<(i32, i32)>,
    AssetsServiceState(assets_service): AssetsServiceState,
) -> Result<Json<AssetPairViewModel>, ApiError> {
    let asset1 = assets_service.get_asset(pair1).await?;
    if asset1.owner.is_some() {
        return Err(AuthError::Unauthorized.into());
    }
    let asset2 = assets_service.get_asset(pair2).await?;
    if asset2.owner.is_some() {
        return Err(AuthError::Unauthorized.into());
    }
    let rates = assets_service.get_asset_pair_rates(pair1, pair2).await?;

    let ret = AssetPairViewModel {
        pair1: asset1.into(),
        pair2: asset2.into(),
        rates: rates.into_iter().map(|x| x.into()).collect(),
    };

    Ok(ret.into())
}

#[tracing::instrument(skip_all, err)]
pub async fn get_custom_asset_pair(
    Path((user_id, pair1, pair2)): Path<(Uuid, i32, i32)>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    AssetsServiceState(assets_service): AssetsServiceState,
) -> Result<Json<AssetPairViewModel>, ApiError> {
    let asset1 = assets_service.get_asset(pair1).await?;
    if asset1.owner.is_some_and(|x| x != user_id) {
        return Err(AuthError::Unauthorized.into());
    }
    let asset2 = assets_service.get_asset(pair2).await?;
    if asset2.owner.is_some_and(|x| x != user_id) {
        return Err(AuthError::Unauthorized.into());
    }

    let rates = assets_service.get_asset_pair_rates(pair1, pair2).await?;

    let ret = AssetPairViewModel {
        pair1: asset1.into(),
        pair2: asset2.into(),
        rates: rates.into_iter().map(|x| x.into()).collect(),
    };

    Ok(ret.into())
}

#[tracing::instrument(skip_all, err)]
pub async fn post_custom_asset(
    Path(user_id): Path<Uuid>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(params): Json<AddAssetViewModel>,
) -> Result<Json<AssetViewModel>, ApiError> {
    let asset_dto = AddCustomAssetDto {
        ticker: params.ticker,
        name: params.name,
        asset_type: params.type_id,
        base_pair_id: params.base_asset_id,
        user_id,
    };

    let new_asset: AssetDto = assets_service.add_custom_asset(asset_dto).await?;
    let ret: AssetViewModel = new_asset.into();
    Ok(ret.into())
}

#[tracing::instrument(skip_all, err)]
pub async fn post_custom_asset_rates(
    Path((user_id, pair1, pair2)): Path<(Uuid, i32, i32)>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(params): Json<AddAssetRateViewModel>,
) -> Result<Json<AssetPairViewModel>, ApiError> {
    let is_user_owned: bool = assets_service
        .validate_asset_ownership(user_id, pair1)
        .await?;

    if !is_user_owned {
        return Err(AuthError::Unauthorized.into());
    }

    assets_service
        .add_rates_by_pair(
            pair1,
            pair2,
            params.rates.into_iter().map(|x| x.into()).collect(),
        )
        .await?;

    //Recall same asset pair get method
    let updated_asset_response = self::get_custom_asset_pair(
        Path((user_id, pair1, pair2)),
        AuthenticatedUserState(_auth),
        AssetsServiceState(assets_service),
    )
    .await;

    updated_asset_response
}

pub async fn delete_custom_asset_rate() {
    todo!();
}

pub async fn delete_custom_asset() {
    todo!();
}
