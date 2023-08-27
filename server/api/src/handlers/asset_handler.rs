use axum::{
    extract::{Path, Query},
    Json,
};
use serde::Deserialize;

use crate::{
    app_error::AppError,
    states::AssetsServiceState,
    view_models::{
        asset_pair_view_model::AssetPairViewModel, asset_rate_view_model::AssetRateViewModel,
        asset_view_model::AssetViewModel,
    },
};

#[derive(Deserialize, Debug)]
pub struct GetAssetsQueryParams {
    page: Option<u64>,
    search: Option<String>,
}

#[tracing::instrument(skip(assets_service), ret, err)]
pub async fn get_assets(
    AssetsServiceState(assets_service): AssetsServiceState,
    query_params: Query<GetAssetsQueryParams>,
) -> Result<Json<Vec<AssetViewModel>>, AppError> {
    let page = query_params.page.unwrap_or_default();

    let assets_vec = assets_service
        .get_assets(page, query_params.search.clone())
        .await?;

    let ret_vec: Vec<AssetViewModel> = assets_vec.iter().map(|val| val.clone().into()).collect();

    Ok(ret_vec.into())
}

#[tracing::instrument(skip(assets_service), ret, err)]
pub async fn get_asset_by_id(
    Path(id): Path<i32>,
    AssetsServiceState(assets_service): AssetsServiceState,
) -> Result<Json<AssetViewModel>, AppError> {
    let asset = assets_service.get_asset(id).await?;
    let ret: AssetViewModel = asset.into();
    Ok(ret.into())
}

#[tracing::instrument(skip(assets_service), ret, err)]
pub async fn get_asset_pair(
    Path((pair1, pair2)): Path<(i32, i32)>,
    AssetsServiceState(assets_service): AssetsServiceState,
) -> Result<Json<AssetPairViewModel>, AppError> {
    let asset1 = assets_service.get_asset(pair1).await?;
    let asset2 = assets_service.get_asset(pair2).await?;
    let rates = assets_service.get_asset_pair_rates(pair1, pair2).await?;

    let ret = AssetPairViewModel {
        pair1: asset1.into(),
        pair2: asset2.into(),
        rates: rates.into_iter().map(|x| x.into()).collect(),
    };

    Ok(ret.into())
}
