use axum::{
    extract::{Path, Query},
    Json,
};
use log::trace;
use serde::Deserialize;

use crate::{
    app_error::AppError, states::AssetsServiceState, view_models::asset_view_model::AssetRespData,
};

#[derive(Deserialize)]
pub struct Pagination {
    p: Option<u64>,
    search: Option<String>,
}

pub async fn get_assets(
    AssetsServiceState(assets_service): AssetsServiceState,
    query_params: Query<Pagination>,
) -> Result<Json<Vec<AssetRespData>>, AppError> {
    trace!("GET /assets");

    let page = query_params.p.unwrap_or_default();

    let assets_vec = assets_service
        .get_assets(page, query_params.search.clone())
        .await?;

    let mut ret_vec: Vec<AssetRespData> = Vec::new();
    for model in assets_vec {
        ret_vec.push(model.into());
    }

    Ok(ret_vec.into())
}

pub async fn get_asset_by_id(
    Path(id): Path<i32>,
    AssetsServiceState(assets_service): AssetsServiceState,
) -> Result<Json<AssetRespData>, AppError> {
    trace!("GET /assets/{}", id);

    let asset = assets_service.get_asset(id).await?;
    let ret: AssetRespData = asset.into();
    Ok(ret.into())
}
