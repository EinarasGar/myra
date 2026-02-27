use crate::view_models::assets::{
    delete_asset_pair_rates::DeleteAssetPairRatesParams,
    get_asset_pair_rates::GetAssetPairRatesRequestParams,
};
use axum::{
    extract::{Path, Query},
    Json,
};
use business::dtos::{
    add_custom_asset_dto::AddCustomAssetDto,
    asset_pair_rate_insert_dto::AssetPairRateInsertDto,
    assets::{asset_id_dto::AssetIdDto, asset_pair_ids_dto::AssetPairIdsDto, update_asset_dto::UpdateAssetDto},
};
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::{auth::AuthError, ApiError},
    parsers::parse_duration_string,
    states::{AssetRatesServiceState, AssetsServiceState},
    view_models::assets::{
        add_asset::{AddAssetRequestViewModel, AddAssetResponseViewModel},
        add_asset_pair_rates::{
            AddAssetPairRatesRequestViewModel, AddAssetPairRatesResponseViewModel,
        },
        base_models::{
            asset::{AssetViewModel, IdentifiableAssetViewModel},
            asset_id::RequiredAssetId,
            asset_pair_metadata::AssetPairMetadataViewModel,
            asset_metadata::AssetMetadataViewModel,
            rate::AssetRateViewModel,
            user_asset_pair_metadata::UserAssetPairMetadataViewModel,
        },
        get_asset::GetAssetResponseViewModel,
        get_asset_pair_rates::GetAssetPairRatesResponseViewModel,
        get_user_asset_pair::GetUserAssetPairResponseViewModel,
        update_asset::{UpdateAssetRequestViewModel, UpdateAssetResponseViewModel},
        update_asset_pair::{UpdateAssetPairRequestViewModel, UpdateAssetPairResponseViewModel},
    },
    view_models::errors::{CreateResponses, DeleteResponses, GetResponses, UpdateResponses},
};

/// Get user asset
///
/// Gets an custom asset added by user
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/assets/{asset_id}",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "Id of the user for which asset belongs to."),
        ("asset_id" = i32, Path, description = "Id of the user asset to retrieve."),
    ),
    responses(
        (status = 200, description = "User asset retrieved successfully.", body = GetAssetResponseViewModel),
        GetResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_user_asset(
    Path((user_id, id)): Path<(Uuid, i32)>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetAssetResponseViewModel>, ApiError> {
    let is_owned = assets_service.validate_asset_ownership(user_id, id).await?;
    if !is_owned {
        return Err(AuthError::Unauthorized.into());
    }

    let asset_dto = assets_service.get_asset_with_metadata(id).await?;

    let ret = GetAssetResponseViewModel {
        asset: asset_dto.asset.into(),
        metadata: AssetMetadataViewModel {
            base_asset_id: RequiredAssetId(asset_dto.base_asset_id.0),
            pairs: asset_dto
                .pairs
                .unwrap_or_default()
                .iter()
                .map(|x| RequiredAssetId(x.0))
                .collect(),
        },
    };

    Ok(ret.into())
}

/// Get user asset pair
///
/// Gets metadata about user asset pair
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/assets/{asset_id}/{reference_id}",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "Id of the user for which asset belongs to."),
        ("asset_id" = i32, Path, description = "Id of the user asset to retrieve."),
        ("reference_id" = i32, Path, description = "Id of the reference asset."),
    ),
    responses(
        (status = 200, description = "User asset pair retrieved successfully.", body = GetUserAssetPairResponseViewModel),
        GetResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_user_asset_pair(
    Path((user_id, pair1, pair2)): Path<(Uuid, i32, i32)>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AssetRatesServiceState(asset_rates_service): AssetRatesServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetUserAssetPairResponseViewModel>, ApiError> {
    let is_owned = assets_service
        .validate_asset_ownership(user_id, pair1)
        .await?;
    if !is_owned {
        return Err(AuthError::Unauthorized.into());
    }

    let pair_id = assets_service.get_asset_pair_id(pair1, pair2).await?;

    let (pair_dtos, latest_rate, user_metadata) = tokio::try_join!(
        assets_service.get_asset_pair(pair1, pair2),
        asset_rates_service.get_pair_latest_direct(AssetPairIdsDto::new(
            AssetIdDto(pair1),
            AssetIdDto(pair2)
        )),
        assets_service.get_asset_pair_user_metadata(pair_id)
    )?;

    let ret = GetUserAssetPairResponseViewModel {
        main_asset: pair_dtos.0.into(),
        reference_asset: pair_dtos.1.into(),
        metadata: latest_rate.map(|rate| AssetPairMetadataViewModel {
            latest_rate: rate.rate,
            last_updated: rate.date,
        }),
        user_metadata: user_metadata.map(|exchange| UserAssetPairMetadataViewModel { exchange }),
    };

    Ok(ret.into())
}

/// Get user asset pair rates
///
/// Gets user asset pair rates based on provided query params
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/assets/{asset_id}/{reference_id}/rates",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "Id of the user for which asset belongs to."),
        ("asset_id" = i32, Path, description = "Id of the user asset to retrieve."),
        ("reference_id" = i32, Path, description = "Id of the reference asset."),
        GetAssetPairRatesRequestParams
    ),
    responses(
        (status = 200, description = "User asset pair rates retrieved successfully.", body = GetAssetPairRatesResponseViewModel),
        GetResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_user_asset_pair_rates(
    Path((user_id, pair1, pair2)): Path<(Uuid, i32, i32)>,
    query_params: Query<GetAssetPairRatesRequestParams>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AssetRatesServiceState(asset_rates_service): AssetRatesServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetAssetPairRatesResponseViewModel>, ApiError> {
    let is_owned = assets_service
        .validate_asset_ownership(user_id, pair1)
        .await?;
    if !is_owned {
        return Err(AuthError::Unauthorized.into());
    }

    let duration = parse_duration_string(query_params.range.clone())?;
    let rates = asset_rates_service
        .get_pairs_by_duration_direct(
            AssetPairIdsDto::new(AssetIdDto(pair1), AssetIdDto(pair2)),
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

/// Update user asset
///
/// Update already existing user defined asset.
#[utoipa::path(
    put,
    path = "/api/users/{user_id}/assets/{asset_id}",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "User id for which to add the asset to."),
        ("asset_id" = i32, Path, description = "User asset to update."),
    ),
    request_body (
        content = UpdateAssetRequestViewModel,
    ),
    responses(
        (status = 200, description = "User asset updated successfully.", body = UpdateAssetResponseViewModel),
        UpdateResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn put_custom_asset(
    Path((user_id, asset_id)): Path<(Uuid, i32)>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(params): Json<UpdateAssetRequestViewModel>,
) -> Result<Json<UpdateAssetResponseViewModel>, ApiError> {
    let is_owned = assets_service
        .validate_asset_ownership(user_id, asset_id)
        .await?;
    if !is_owned {
        return Err(AuthError::Unauthorized.into());
    }

    let update_dto = UpdateAssetDto {
        asset_id,
        ticker: params.asset.ticker.clone(),
        name: params.asset.name.clone(),
        asset_type: params.asset.asset_type.0,
        base_pair_id: params.base_asset_id.0,
        user_id,
    };

    assets_service.update_asset(update_dto).await?;

    let ret = UpdateAssetResponseViewModel {
        asset: params.asset,
        base_asset_id: params.base_asset_id,
    };

    Ok(ret.into())
}

/// Update user asset pair metadata
///
/// Change the metadata related to user asset pair.
/// As user asset pair is not uniquely identifiable we do not need a POST to create it.
/// It is created by default as you add rates, and this endpoint serves as a way to add or update metadata.
#[utoipa::path(
    put,
    path = "/api/users/{user_id}/assets/{asset_id}/{reference_id}/usermetadata",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "User id for which to add the asset to."),
        ("asset_id" = i32, Path, description = "User asset to update."),
        ("reference_id" = i32, Path, description = "User asset to update."),
    ),
    request_body (
        content = UpdateAssetPairRequestViewModel,
    ),
    responses(
        (status = 200, description = "User asset pair updated successfully.", body = UpdateAssetPairResponseViewModel),
        UpdateResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn put_custom_asset_pair(
    Path((user_id, pair1, pair2)): Path<(Uuid, i32, i32)>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(params): Json<UpdateAssetPairRequestViewModel>,
) -> Result<Json<UpdateAssetPairResponseViewModel>, ApiError> {
    let is_owned = assets_service
        .validate_asset_ownership(user_id, pair1)
        .await?;
    if !is_owned {
        return Err(AuthError::Unauthorized.into());
    }

    let pair_id = assets_service.get_asset_pair_id(pair1, pair2).await?;
    assets_service
        .upsert_asset_pair_user_metadata(pair_id, params.metadata.exchange.clone())
        .await?;

    let ret = UpdateAssetPairResponseViewModel {
        metadata: params.metadata,
    };

    Ok(ret.into())
}

/// Add user asset
///
/// Adds a user defined asset.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/assets",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "User id for which to add the asset to."),
    ),
    request_body (
        content = AddAssetRequestViewModel,
    ),
    responses(
        (status = 201, description = "User asset created successfully.", body = AddAssetResponseViewModel),
        CreateResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn post_custom_asset(
    Path(user_id): Path<Uuid>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(params): Json<AddAssetRequestViewModel>,
) -> Result<Json<AddAssetResponseViewModel>, ApiError> {
    let asset_dto = AddCustomAssetDto {
        ticker: params.asset.ticker.clone(),
        name: params.asset.name.clone(),
        asset_type: params.asset.asset_type.0,
        base_pair_id: params.base_asset_id.0,
        user_id,
    };

    let new_asset = assets_service.add_custom_asset(asset_dto).await?;

    let ret = AddAssetResponseViewModel {
        asset: IdentifiableAssetViewModel {
            asset_id: RequiredAssetId(new_asset.asset_id),
            asset: AssetViewModel {
                ticker: params.asset.ticker,
                name: params.asset.name,
                asset_type: params.asset.asset_type,
            },
        },
        base_asset_id: params.base_asset_id,
    };

    Ok(ret.into())
}

/// Add user asset pair rates
///
/// Adds a list of user asset pair rates. The list may contain one or many elements.
/// If the rate already exists, error will be returned.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/assets/{asset_id}/{reference_id}/rates",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "User id for which the asset belongs to."),
        ("asset_id" = i32, Path, description = "The Id of the user asset."),
        ("reference_id" = i32, Path, description = "The Id of the reference asset."),
    ),
    request_body (
        content = AddAssetPairRatesRequestViewModel,
    ),
    responses(
        (status = 201, description = "Asset pair rates created successfully.", body = AddAssetPairRatesResponseViewModel),
        CreateResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn post_custom_asset_rates(
    Path((user_id, pair1, pair2)): Path<(Uuid, i32, i32)>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AssetRatesServiceState(asset_rates_service): AssetRatesServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(params): Json<AddAssetPairRatesRequestViewModel>,
) -> Result<Json<AddAssetPairRatesResponseViewModel>, ApiError> {
    let is_owned = assets_service
        .validate_asset_ownership(user_id, pair1)
        .await?;
    if !is_owned {
        return Err(AuthError::Unauthorized.into());
    }

    let pair_id = assets_service.get_asset_pair_id(pair1, pair2).await?;

    let rate_inserts: Vec<AssetPairRateInsertDto> = params
        .rates
        .iter()
        .map(|r| AssetPairRateInsertDto {
            pair_id,
            rate: r.rate,
            date: r.date,
        })
        .collect();

    asset_rates_service.insert_pair_many(rate_inserts).await?;

    let ret = AddAssetPairRatesResponseViewModel {
        rates: params.rates,
    };

    Ok(ret.into())
}

/// Delete user asset pair rates
///
/// Request with no parameters deletes all rates related to a user asset and its pair.
/// If the parameters are specified, it deletes only the subset of it.
#[utoipa::path(
    delete,
    path = "/api/users/{user_id}/assets/{asset_id}/{reference_id}/rates",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "User id for which the asset belongs to."),
        ("asset_id" = i32, Path, description = "The Id of the user asset."),
        ("reference_id" = i32, Path, description = "The Id of the reference asset."),
        DeleteAssetPairRatesParams
    ),
    responses(
        (status = 200, description = "All asset pair rates deleted successfully."),
        DeleteResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn delete_asset_pair_rates(
    Path((user_id, pair1, pair2)): Path<(Uuid, i32, i32)>,
    query_params: Query<DeleteAssetPairRatesParams>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AssetRatesServiceState(asset_rates_service): AssetRatesServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<(), ApiError> {
    let is_owned = assets_service
        .validate_asset_ownership(user_id, pair1)
        .await?;
    if !is_owned {
        return Err(AuthError::Unauthorized.into());
    }

    let pair_id = assets_service.get_asset_pair_id(pair1, pair2).await?;
    asset_rates_service
        .delete_rates_in_range(pair_id, query_params.start_timestamp, query_params.end_timestamp)
        .await?;

    Ok(())
}

/// Delete user asset pair
///
/// Deletes user asset pair and its associated metadata.
#[utoipa::path(
    delete,
    path = "/api/users/{user_id}/assets/{asset_id}/{reference_id}",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "User id for which the asset belongs to."),
        ("asset_id" = i32, Path, description = "The Id of the user asset."),
        ("reference_id" = i32, Path, description = "The Id of the reference asset."),
    ),
    responses(
        (status = 200, description = "Asset pair deleted successfully."),
        DeleteResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn delete_asset_pair(
    Path((user_id, pair1, pair2)): Path<(Uuid, i32, i32)>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<(), ApiError> {
    assets_service
        .delete_asset_pair(user_id, pair1, pair2)
        .await?;
    Ok(())
}

/// Delete user asset
///
/// Deletes manually added user asset along with all the related information about it.
/// Return an error if the asset is in use or other assets are dependent on it as base.
#[utoipa::path(
    delete,
    path = "/api/users/{user_id}/assets/{asset_id}",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "User id for which the asset belongs to."),
        ("asset_id" = i32, Path, description = "The Id of the asset to be deleted."),
    ),
    responses(
        (status = 200, description = "Asset deleted successfully."),
        DeleteResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn delete_asset(
    Path((user_id, asset_id)): Path<(Uuid, i32)>,
    AssetsServiceState(assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<(), ApiError> {
    assets_service.delete_asset(user_id, asset_id).await?;
    Ok(())
}
