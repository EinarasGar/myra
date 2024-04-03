use crate::view_models::assets::{
    delete_asset_pair_rates::DeleteAssetPairRatesParams,
    get_asset_pair_rates::GetAssetPairRatesRequestParams,
};
use axum::{
    extract::{Path, Query},
    Json,
};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    states::AssetsServiceState,
    view_models::assets::{
        add_asset::{AddAssetRequestViewModel, AddAssetResponseViewModel},
        add_asset_pair_rates::{
            AddAssetPairRatesRequestViewModel, AddAssetPairRatesResponseViewModel,
        },
        get_asset::GetAssetResponseViewModel,
        get_asset_pair_rates::GetAssetPairRatesResponseViewModel,
        get_user_asset_pair::GetUserAssetPairResponseViewModel,
        update_asset::{UpdateAssetRequestViewModel, UpdateAssetResponseViewModel},
        update_asset_pair::{UpdateAssetPairRequestViewModel, UpdateAssetPairResponseViewModel},
    },
};

/// Get user asset
///
/// Gets an custom asset added by user
#[utoipa::path(
    get,
    path = "/api/users/:user_id/assets/:asset_id",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "Id of the user for which asset belongs to."),
        ("asset_id" = i32, Path, description = "Id of the user asset to retrieve."),
    ),
    responses(
        (status = 200,  body = GetAssetResponseViewModel),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_user_asset(
    Path((_user_id, _id)): Path<(Uuid, i32)>,
    AssetsServiceState(_assets_service): AssetsServiceState,
) -> Result<Json<GetAssetResponseViewModel>, ApiError> {
    // let asset = assets_service.get_asset(id).await?;
    // if asset.owner.is_some() {
    //     return Err(AuthError::Unauthorized.into());
    // }
    // let ret: AssetViewModel = asset.into();
    // Ok(ret.into())
    unimplemented!()
}

/// Get user asset pair
///
/// Gets metadata about user asset pair
#[utoipa::path(
    get,
    path = "/api/users/:user_id/assets/:asset_id/:reference_id",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "Id of the user for which asset belongs to."),
        ("asset_id" = i32, Path, description = "Id of the user asset to retrieve."),
        ("reference_id" = i32, Path, description = "Id of the reference asset."),
    ),
    responses(
        (status = 200,  body = GetUserAssetPairResponseViewModel),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_user_asset_pair(
    Path((_pair1, _pair2)): Path<(i32, i32)>,
    AssetsServiceState(_assets_service): AssetsServiceState,
) -> Result<Json<GetUserAssetPairResponseViewModel>, ApiError> {
    // let asset1 = assets_service.get_asset(pair1).await?;
    // if asset1.owner.is_some() {
    //     return Err(AuthError::Unauthorized.into());
    // }
    // let asset2 = assets_service.get_asset(pair2).await?;
    // if asset2.owner.is_some() {
    //     return Err(AuthError::Unauthorized.into());
    // }
    // let rates = assets_service.get_asset_pair_rates(pair1, pair2).await?;

    // let ret = AssetPairViewModel {
    //     pair1: asset1.into(),
    //     pair2: asset2.into(),
    //     rates: rates.into_iter().map(|x| x.into()).collect(),
    // };

    // Ok(ret.into())
    unimplemented!()
}

/// Get user asset pair rates
///
/// Gets user asset pair rates based on provided query params
#[utoipa::path(
    get,
    path = "/api/users/:user_id/assets/:asset_id/:reference_id/rates",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "Id of the user for which asset belongs to."),
        ("asset_id" = i32, Path, description = "Id of the user asset to retrieve."),
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
pub async fn get_user_asset_pair_rates(
    Path((_pair1, _pair2)): Path<(i32, i32)>,
    _query_params: Query<GetAssetPairRatesRequestParams>,
    AssetsServiceState(_assets_service): AssetsServiceState,
) -> Result<Json<GetAssetPairRatesResponseViewModel>, ApiError> {
    // let asset1 = assets_service.get_asset(pair1).await?;
    // if asset1.owner.is_some() {
    //     return Err(AuthError::Unauthorized.into());
    // }
    // let asset2 = assets_service.get_asset(pair2).await?;
    // if asset2.owner.is_some() {
    //     return Err(AuthError::Unauthorized.into());
    // }
    // let rates = assets_service.get_asset_pair_rates(pair1, pair2).await?;

    // let ret = AssetPairViewModel {
    //     pair1: asset1.into(),
    //     pair2: asset2.into(),
    //     rates: rates.into_iter().map(|x| x.into()).collect(),
    // };

    // Ok(ret.into())
    unimplemented!()
}

// #[tracing::instrument(skip_all, err)]
// pub async fn get_custom_asset_pair(
//     Path((user_id, pair1, pair2)): Path<(Uuid, i32, i32)>,
//     AuthenticatedUserState(_auth): AuthenticatedUserState,
//     AssetsServiceState(assets_service): AssetsServiceState,
// ) -> Result<Json<AssetPairViewModel>, ApiError> {
//     let asset1 = assets_service.get_asset(pair1).await?;
//     if asset1.owner.is_some_and(|x| x != user_id) {
//         return Err(AuthError::Unauthorized.into());
//     }
//     let asset2 = assets_service.get_asset(pair2).await?;
//     if asset2.owner.is_some_and(|x| x != user_id) {
//         return Err(AuthError::Unauthorized.into());
//     }

//     let rates = assets_service.get_asset_pair_rates(pair1, pair2).await?;

//     let ret = AssetPairViewModel {
//         pair1: asset1.into(),
//         pair2: asset2.into(),
//         rates: rates.into_iter().map(|x| x.into()).collect(),
//     };

//     Ok(ret.into())
// }

/// Update user asset
///
/// Update already existing user defined asset.
#[utoipa::path(
    put,
    path = "/api/users/:user_id/assets/:asset_id",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "User id for which to add the asset to."),
        ("asset_id" = i32, Path, description = "User asset to update."),
    ),
    request_body (
        content = UpdateAssetRequestViewModel,
    ),
    responses(
        (status = 200, description = "User asset added successfully.", body = UpdateAssetResponseViewModel),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn put_custom_asset(
    Path((_user_id, _asset_id)): Path<(Uuid, i32)>,
    AssetsServiceState(_assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(_params): Json<UpdateAssetRequestViewModel>,
) -> Result<Json<UpdateAssetResponseViewModel>, ApiError> {
    // let asset_dto = AddCustomAssetDto {
    //     ticker: params.ticker,
    //     name: params.name,
    //     asset_type: params.type_id,
    //     base_pair_id: params.base_asset_id,
    //     user_id,
    // };

    // let new_asset: AssetDto = assets_service.add_custom_asset(asset_dto).await?;
    // let ret: AssetViewModel = new_asset.into();
    // Ok(ret.into())
    unimplemented!()
}

/// Update user asset pair metadata
///
/// Change the metadata related to user asset pair.
/// As user asset pair is not uniquely identifiable we do not need a POST to create it.
/// It is created by default as you add rates, and this endpoint serves as a way to add or update metadata.
#[utoipa::path(
    put,
    path = "/api/users/:user_id/assets/:asset_id/:reference_id/usermetadata",
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
        (status = 200, description = "User asset added successfully.", body = UpdateAssetPairResponseViewModel),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn put_custom_asset_pair(
    Path((_user_id, _asset_id)): Path<(Uuid, i32)>,
    AssetsServiceState(_assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(_params): Json<UpdateAssetPairRequestViewModel>,
) -> Result<Json<UpdateAssetPairResponseViewModel>, ApiError> {
    unimplemented!()
}

/// Add user asset
///
/// Adds a user defined asset.
#[utoipa::path(
    post,
    path = "/api/users/:user_id/assets",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "User id for which to add the asset to."),
    ),
    request_body (
        content = AddAssetRequestViewModel,
    ),
    responses(
        (status = 200, description = "User asset added successfully.", body = AddAssetResponseViewModel),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn post_custom_asset(
    Path(_user_id): Path<Uuid>,
    AssetsServiceState(_assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(_params): Json<AddAssetRequestViewModel>,
) -> Result<Json<AddAssetResponseViewModel>, ApiError> {
    // let asset_dto = AddCustomAssetDto {
    //     ticker: params.ticker,
    //     name: params.name,
    //     asset_type: params.type_id,
    //     base_pair_id: params.base_asset_id,
    //     user_id,
    // };

    // let new_asset: AssetDto = assets_service.add_custom_asset(asset_dto).await?;
    // let ret: AssetViewModel = new_asset.into();
    // Ok(ret.into())
    unimplemented!()
}

/// Add user asset pair rates
///
/// Adds a list of user asset pair rates. The list may contain one or many elements.
/// If the rate already exists, error will be returned.
#[utoipa::path(
    post,
    path = "/api/users/:user_id/assets/:asset_id/:reference_id/rates",
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
        (status = 200, description = "All asset pair rates added successfully.", body = AddAssetPairRatesResponseViewModel),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn post_custom_asset_rates(
    Path((_user_id, _pair1, _pair2)): Path<(Uuid, i32, i32)>,
    AssetsServiceState(_assets_service): AssetsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(_params): Json<AddAssetPairRatesRequestViewModel>,
) -> Result<Json<AddAssetPairRatesResponseViewModel>, ApiError> {
    // let is_user_owned: bool = assets_service
    //     .validate_asset_ownership(user_id, pair1)
    //     .await?;

    // if !is_user_owned {
    //     return Err(AuthError::Unauthorized.into());
    // }

    // assets_service
    //     .add_rates_by_pair(
    //         pair1,
    //         pair2,
    //         params.rates.into_iter().map(|x| x.into()).collect(),
    //     )
    //     .await?;

    // //Recall same asset pair get method
    // self::get_custom_asset_pair(
    //     Path((user_id, pair1, pair2)),
    //     AuthenticatedUserState(_auth),
    //     AssetsServiceState(assets_service),
    // )
    // .await
    unimplemented!()
}

/// Delete user asset pair rates
///
/// Request with no parameters deletes all rates related to a user asset and its pair.
/// If the parameters are specified, it deletes only the subset of it.
#[utoipa::path(
    delete,
    path = "/api/users/:user_id/assets/:asset_id/:reference_id/rates",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "User id for which the asset belongs to."),
        ("asset_id" = i32, Path, description = "The Id of the user asset."),
        ("reference_id" = i32, Path, description = "The Id of the reference asset."),
        DeleteAssetPairRatesParams
    ),
    responses(
        (status = 200, description = "All asset pair rates deleted successfully."),
    ),
    security(
        ("auth_token" = [])
    )

)]
pub async fn delete_asset_pair_rates(
    Path((_user_id, _asset_id, _reference_id)): Path<(Uuid, i32, i32)>,
    _query_params: Query<DeleteAssetPairRatesParams>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<(), ApiError> {
    unimplemented!();
}

/// Delete user asset pair
///
/// Deletes user asset pair and its associated metadata.
#[utoipa::path(
    delete,
    path = "/api/users/:user_id/assets/:asset_id/:reference_id",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "User id for which the asset belongs to."),
        ("asset_id" = i32, Path, description = "The Id of the user asset."),
        ("reference_id" = i32, Path, description = "The Id of the reference asset."),
    ),
    responses(
        (status = 200, description = "Asset pair deleted successfully."),
    ),
    security(
        ("auth_token" = [])
    )

)]
pub async fn delete_asset_pair(
    Path((_user_id, _asset_id, _reference_id, _date)): Path<(Uuid, i32, i32, OffsetDateTime)>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<(), ApiError> {
    unimplemented!();
}

/// Delete user asset
///
/// Deletes manually added user asset along with all the related information about it.
/// Return an error if the asset is in use or other assets are dependent on it as base.
#[utoipa::path(
    delete,
    path = "/api/users/:user_id/assets/:asset_id",
    tag = "User Assets",
    params(
        ("user_id" = Uuid, Path, description = "User id for which the asset belongs to."),
        ("asset_id" = i32, Path, description = "The Id of the asset to be deleted."),
    ),
    responses(
        (status = 200, description = "Asset deleted successfully."),
    ),
    security(
        ("auth_token" = [])
    )

)]
pub async fn delete_asset(
    Path((_user_id, _asset_id)): Path<(Uuid, i32)>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<(), ApiError> {
    unimplemented!();
}
