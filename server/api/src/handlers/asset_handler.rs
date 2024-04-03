use axum::{
    extract::{Path, Query},
    Json,
};

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    states::AssetsServiceState,
    view_models::{
        assets::{
            get_asset::GetAssetResponseViewModel,
            get_asset_pair::GetAssetPairResponseViewModel,
            get_asset_pair_rates::{
                GetAssetPairRatesRequestParams, GetAssetPairRatesResponseViewModel,
            },
        },
        base_models::search::{PageOfAssetsResultsWithLookupViewModel, PaginatedSearchQuery},
    },
};

/// Search assets
///
/// Query to search shared assets. Returns a page of results.
/// If not query parameters are provided, returns results sorted by most popular.
/// The equivalent search endpoint for the user assets is not provided, as user
/// assets can be retrieved in full due to it being a small subset.
#[utoipa::path(
    get,
    path = "/api/assets",
    tag = "Assets",
    params(PaginatedSearchQuery),
    responses(
        (status = 200,  body = PageOfAssetsResultsWithLookupViewModel),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn search_assets(
    _query_params: Query<PaginatedSearchQuery>,
    AssetsServiceState(_assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<PageOfAssetsResultsWithLookupViewModel>, ApiError> {
    unimplemented!()
}

/// Get asset
///
/// Gets a shared asset.
#[utoipa::path(
    get,
    path = "/api/assets/:asset_id",
    tag = "Assets",
    params(
        ("asset_id" = i32, Path, description = "Id of the shared asset to retrieve.")
    ),
    responses(
        (status = 200,  body = GetAssetResponseViewModel),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_asset(
    Path(_id): Path<i32>,
    AssetsServiceState(_assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetAssetResponseViewModel>, ApiError> {
    unimplemented!()
}

/// Get asset pair
///
/// Gets asset pair and its metadata.
#[utoipa::path(
    get,
    path = "/api/assets/:asset_id/:reference_id",
    tag = "Assets",
    params(
        ("asset_id" = i32, Path, description = "Id of the shared asset to retrieve."),
        ("reference_id" = i32, Path, description = "Id of the reference asset.")
    ),
    responses(
        (status = 200,  body = GetAssetPairResponseViewModel),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_asset_pair(
    Path((_id, _reference_id)): Path<(i32, i32)>,
    AssetsServiceState(_assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetAssetPairResponseViewModel>, ApiError> {
    unimplemented!()
}

/// Get asset pair rates
///
/// Gets asset pair rates based on provided query params
#[utoipa::path(
    get,
    path = "/api/assets/:asset_id/:reference_id/rates",
    tag = "Assets",
    params(
        ("asset_id" = i32, Path, description = "Id of the shared asset to retrieve."),
        ("reference_id" = i32, Path, description = "Id of the reference asset."),
        GetAssetPairRatesRequestParams
    ),
    responses(
        (status = 200,  body = GetAssetPairRatesResponseViewModel),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_asset_pair_rates(
    Path((_id, _reference_id)): Path<(i32, i32)>,
    _query_params: Query<GetAssetPairRatesRequestParams>,
    AssetsServiceState(_assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetAssetPairRatesResponseViewModel>, ApiError> {
    unimplemented!()
}
