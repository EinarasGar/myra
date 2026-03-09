use std::collections::{HashMap, HashSet};

use axum::{extract::Path, Json};
use business::dtos::{
    assets::{asset_id_dto::AssetIdDto, asset_pair_ids_dto::AssetPairIdsDto},
    net_worth::range_dto::RangeDto,
    paging_dto::PagingDto,
};

use crate::view_models::assets::get_asset_types::GetAssetTypesResponseViewModel;
use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    extractors::ValidatedQuery,
    states::{AssetRatesServiceState, AssetsServiceState},
    view_models::errors::GetResponses,
    view_models::{
        assets::{
            base_models::{
                asset_id::RequiredAssetId,
                asset_metadata::{AssetMetadataViewModel, AssetPairInfoViewModel},
                asset_pair_metadata::AssetPairMetadataViewModel,
                asset_type::IdentifiableAssetTypeViewModel,
                asset_type_id::RequiredAssetTypeId,
                lookup::AssetLookupTables,
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
        base_models::search::{
            PageOfAssetsResultsWithLookupViewModel, PageOfResults, PaginatedSearchQuery,
        },
    },
};

/// Search assets
///
/// Query to search shared assets. Returns a page of results.
/// If no query parameters are provided, returns results sorted by most popular.
/// The equivalent search endpoint for the user assets is not provided, as user
/// assets can be retrieved in full due to it being a small subset.
#[utoipa::path(
    get,
    path = "/api/assets",
    tag = "Assets",
    params(PaginatedSearchQuery),
    responses(
        (status = 200, description = "Assets retrieved successfully.", body = PageOfResults<GetAssetsLineResponseViewModel, AssetLookupTables>),
        GetResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn search_assets(
    ValidatedQuery(query_params): ValidatedQuery<PaginatedSearchQuery>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<PageOfResults<GetAssetsLineResponseViewModel, AssetLookupTables>>, ApiError> {
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
                id: RequiredAssetTypeId(x.asset_type.id),
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
    path = "/api/assets/{asset_id}",
    tag = "Assets",
    params(
        ("asset_id" = i32, Path, description = "Id of the shared asset to retrieve.")
    ),
    responses(
        (status = 200, description = "Asset retrieved successfully.", body = GetAssetResponseViewModel),
        GetResponses
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

    let base_asset_id = asset_dto.base_asset_id.0;
    let pair_ids: Vec<i32> = asset_dto
        .pairs
        .as_ref()
        .map(|p| p.iter().map(|x| x.0).collect())
        .unwrap_or_default();

    // Collect all IDs to fetch: pair IDs + base asset ID
    let mut all_ids: HashSet<i32> = pair_ids.iter().copied().collect();
    all_ids.insert(base_asset_id);

    let fetched_assets = if !all_ids.is_empty() {
        assets_service.get_assets(all_ids).await?
    } else {
        vec![]
    };

    let asset_map: std::collections::HashMap<i32, _> =
        fetched_assets.into_iter().map(|a| (a.id.0, a)).collect();

    let pair_infos: Vec<AssetPairInfoViewModel> = pair_ids
        .iter()
        .filter_map(|id| {
            asset_map.get(id).map(|a| AssetPairInfoViewModel {
                asset_id: RequiredAssetId(a.id.0),
                ticker: a.ticker.clone(),
                name: a.name.clone(),
            })
        })
        .collect();

    let base_asset_info = asset_map
        .get(&base_asset_id)
        .map(|a| AssetPairInfoViewModel {
            asset_id: RequiredAssetId(a.id.0),
            ticker: a.ticker.clone(),
            name: a.name.clone(),
        })
        .ok_or_else(|| anyhow::anyhow!("Base asset not found"))?;

    let ret = GetAssetResponseViewModel {
        asset: asset_dto.asset.into(),
        metadata: AssetMetadataViewModel {
            base_asset: base_asset_info,
            pairs: pair_infos,
        },
    };

    Ok(ret.into())
}

/// Get asset pair
///
/// Gets asset pair and its metadata.
#[utoipa::path(
    get,
    path = "/api/assets/{asset_id}/{reference_id}",
    tag = "Assets",
    params(
        ("asset_id" = i32, Path, description = "Id of the shared asset to retrieve."),
        ("reference_id" = i32, Path, description = "Id of the reference asset.")
    ),
    responses(
        (status = 200, description = "Asset pair retrieved successfully.", body = GetAssetPairResponseViewModel),
        GetResponses
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
    path = "/api/assets/{asset_id}/{reference_id}/rates",
    tag = "Assets",
    params(
        ("asset_id" = i32, Path, description = "Id of the shared asset to retrieve."),
        ("reference_id" = i32, Path, description = "Id of the reference asset."),
        GetAssetPairRatesRequestParams
    ),
    responses(
        (status = 200, description = "Asset pair rates retrieved successfully.", body = GetAssetPairRatesResponseViewModel),
        GetResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_asset_pair_rates(
    Path((id, reference_id)): Path<(i32, i32)>,
    ValidatedQuery(query_params): ValidatedQuery<GetAssetPairRatesRequestParams>,
    AssetRatesServiceState(asset_rates_service): AssetRatesServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetAssetPairRatesResponseViewModel>, ApiError> {
    let range = RangeDto::StringBased(query_params.range.clone());
    let rates = asset_rates_service
        .get_pairs_by_range_direct(
            AssetPairIdsDto::new(AssetIdDto(id), AssetIdDto(reference_id)),
            range,
        )
        .await?;

    let ret_rates: Vec<AssetRateViewModel> = rates.into_iter().map(Into::into).collect();

    let ret = GetAssetPairRatesResponseViewModel {
        rates: ret_rates,
        range: query_params.range.clone(),
    };

    Ok(ret.into())
}

/// Get asset types
///
/// Retrieves all available asset types
#[utoipa::path(
    get,
    path = "/api/assets/types",
    tag = "Assets",
    responses(
        (status = 200, description = "List of available asset types.", body = GetAssetTypesResponseViewModel),
        GetResponses
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_asset_types(
    AssetsServiceState(assets_service): AssetsServiceState,
) -> Result<Json<GetAssetTypesResponseViewModel>, ApiError> {
    let dtos = assets_service.get_asset_types().await?;
    let ret = GetAssetTypesResponseViewModel {
        asset_types: dtos.into_iter().map(Into::into).collect(),
    };
    Ok(ret.into())
}
