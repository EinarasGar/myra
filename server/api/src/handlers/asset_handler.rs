use std::collections::HashMap;

use axum::{
    extract::{Path, Query},
    Json,
};
use business::dtos::{
    assets::{asset_id_dto::AssetIdDto, asset_pair_ids_dto::AssetPairIdsDto},
    paging_dto::PagingDto,
};

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    parsers::parse_duration_string,
    states::{AssetRatesServiceState, AssetsServiceState},
    view_models::{
        assets::{
            base_models::{
                asset_metadata::AssetMetadataViewModel,
                asset_pair_metadata::AssetPairMetadataViewModel,
                asset_type::IdentifiableAssetTypeViewModel, lookup::AssetLookupTables,
                rate::AssetRateViewModel,
                shared_asset_pair_metadata::SharedAssetPairMetadataViewModel,
            },
            get_asset::GetAssetResponseViewModel,
            get_asset_pair::GetAssetPairResponseViewModel,
            get_asset_pair_rates::{
                GetAssetPairRatesRequestParams, GetAssetPairRatesResponseViewModel,
            },
            get_assets::GetAssetsLineResponseViewModel,
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
    query_params: Query<PaginatedSearchQuery>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<PageOfAssetsResultsWithLookupViewModel>, ApiError> {
    let paging_dto = PagingDto {
        start: query_params.start,
        count: query_params.count,
    };

    let page = assets_service
        .search_assets(paging_dto, query_params.query.clone())
        .await?;

    let mut map: HashMap<i32, IdentifiableAssetTypeViewModel> = HashMap::new();
    for x in &page.results {
        map.entry(x.asset_type.id)
            .or_insert_with(|| IdentifiableAssetTypeViewModel {
                name: x.asset_type.name.clone(),
                id: x.asset_type.id,
            });
    }
    let metadata: Vec<IdentifiableAssetTypeViewModel> = map.into_values().collect();

    let asset_view_models: Vec<GetAssetsLineResponseViewModel> = page
        .results
        .into_iter()
        .map(|x| GetAssetsLineResponseViewModel { asset: x.into() })
        .collect();

    let ret = PageOfAssetsResultsWithLookupViewModel {
        results: asset_view_models,
        total_results: page.total_results,
        lookup_tables: AssetLookupTables {
            asset_types: metadata,
        },
    };
    Ok(ret.into())
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
    Path(id): Path<i32>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetAssetResponseViewModel>, ApiError> {
    let asset_dto = assets_service.get_asset_with_metadata(id).await?;

    let ret = GetAssetResponseViewModel {
        asset: asset_dto.asset.into(),
        metadata: AssetMetadataViewModel {
            base_asset_id: asset_dto.base_asset_id,
            pairs: asset_dto.pairs.unwrap(),
        },
    };

    Ok(ret.into())
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
    Path((id, reference_id)): Path<(i32, i32)>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AssetRatesServiceState(asset_rates_service): AssetRatesServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetAssetPairResponseViewModel>, ApiError> {
    let (pair_dtos, latest_rate, shared_metadata) = tokio::try_join!(
        assets_service.get_asset_pair(id, reference_id),
        asset_rates_service.get_pair_latest_direct(AssetPairIdsDto::new(
            AssetIdDto(id),
            AssetIdDto(reference_id)
        )),
        assets_service.get_shared_asset_pair_metadata(id, reference_id)
    )?;

    let ret = GetAssetPairResponseViewModel {
        main_asset: pair_dtos.0.into(),
        reference_asset: pair_dtos.1.into(),
        metadata: SharedAssetPairMetadataViewModel {
            common_metadata: latest_rate.map(|rate| AssetPairMetadataViewModel {
                latest_rate: rate.rate,
                last_updated: rate.date,
            }),
            volume: shared_metadata.map(|x| x.volume),
        },
    };

    Ok(ret.into())
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
    Path((id, reference_id)): Path<(i32, i32)>,
    query_params: Query<GetAssetPairRatesRequestParams>,
    AssetRatesServiceState(asset_rates_service): AssetRatesServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetAssetPairRatesResponseViewModel>, ApiError> {
    let duration = parse_duration_string(query_params.range.clone())?;
    let rates = asset_rates_service
        .get_pairs_by_duration_direct(
            AssetPairIdsDto::new(AssetIdDto(id), AssetIdDto(reference_id)),
            duration,
        )
        .await?;

    let ret_rates: Vec<AssetRateViewModel> = rates.into_iter().map(Into::into).collect();

    let ret = GetAssetPairRatesResponseViewModel {
        rates: ret_rates,
        range: query_params.range.clone(),
    };

    Ok(ret.into())
}
