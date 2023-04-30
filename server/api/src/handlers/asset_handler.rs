use axum::{
    extract::{Path, Query},
    Json,
};
use serde::Deserialize;
use tracing::log::trace;

use crate::{
    app_error::AppError, states::AssetsServiceState, view_models::asset_view_model::AssetViewModel,
};

#[derive(Deserialize)]
pub struct GetAssetsQueryParams {
    page: Option<u64>,
    search: Option<String>,
}

pub async fn get_assets(
    AssetsServiceState(assets_service): AssetsServiceState,
    query_params: Query<GetAssetsQueryParams>,
) -> Result<Json<Vec<AssetViewModel>>, AppError> {
    trace!("GET /assets");

    let page = query_params.page.unwrap_or_default();

    let assets_vec = assets_service
        .get_assets(page, query_params.search.clone())
        .await?;

    let ret_vec: Vec<AssetViewModel> = assets_vec.iter().map(|val| val.clone().into()).collect();

    Ok(ret_vec.into())
}

pub async fn get_asset_by_id(
    Path(id): Path<i32>,
    AssetsServiceState(assets_service): AssetsServiceState,
) -> Result<Json<AssetViewModel>, AppError> {
    trace!("GET /assets/{}", id);

    let asset = assets_service.get_asset(id).await?;
    let ret: AssetViewModel = asset.into();
    Ok(ret.into())
}
