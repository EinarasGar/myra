use axum::{extract::Path, http::StatusCode, Json};
use business::dtos::paging_dto::PaginationModeDto;
use business::dtos::transaction_dto::TransactionDto;
use itertools::Itertools;
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub(crate) struct GroupIdPath {
    group_id: Uuid,
}

use crate::{
    auth::AuthenticatedUserId,
    converters::{transaction_dtos_to_account_ids_hashset, transaction_dtos_to_asset_ids_hashset},
    errors::ApiError,
    extractors::{ValidatedJson, ValidatedQuery},
    states::{AccountsServiceState, AssetsServiceState, TransactionGroupServiceState},
    view_models::errors::{CreateResponses, DeleteResponses, GetResponses, UpdateResponses},
    view_models::transactions::validation::Validatable,
    view_models::{
        base_models::search::{CursorOrPaginatedSearchQuery, TransactionGroupsPage},
        transactions::{
            add_transaction_group::{
                AddTransactionGroupRequestViewModel, AddTransactionGroupResponseViewModel,
            },
            base_models::metadata_lookup::MetadataLookupTables,
            get_transaction_group::GetTransactionGroupLineResponseViewModel,
            update_transaction_group::{
                UpdateTransactionGroupRequestViewModel, UpdateTransactionGroupResponseViewModel,
            },
        },
    },
};

/// Add new
///
/// Adds a group of transactions with metadata related to all of them.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/transactions/groups",
    tag = "Transaction Groups",
    request_body (
      content = AddTransactionGroupRequestViewModel,
    ),
    responses(
        (status = 201, description = "Transaction group created successfully.", body = AddTransactionGroupResponseViewModel),
        CreateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User Id for which to add the transaction group for."),
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn add_transaction_group(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    TransactionGroupServiceState(service): TransactionGroupServiceState,
    AssetsServiceState(asset_service): AssetsServiceState,
    AccountsServiceState(accounts_service): AccountsServiceState,
    ValidatedJson(params): ValidatedJson<AddTransactionGroupRequestViewModel>,
) -> Result<(StatusCode, Json<AddTransactionGroupResponseViewModel>), ApiError> {
    params.group.validate()?;

    let transaction_dtos: Vec<TransactionDto> = params
        .group
        .transactions
        .into_iter()
        .map(Into::into)
        .collect();

    let result = service
        .create_transaction_group(
            user_id,
            params.group.description.into_inner(),
            params.group.category_id.0,
            params.group.date,
            transaction_dtos,
        )
        .await
        .map_err(ApiError::from_anyhow)?;

    let tx_refs: Vec<_> = result.transactions.iter().collect();
    let asset_ids = transaction_dtos_to_asset_ids_hashset(&tx_refs);
    let account_ids = transaction_dtos_to_account_ids_hashset(&tx_refs);

    let (assets, accounts) = tokio::try_join!(
        asset_service.get_assets(asset_ids),
        accounts_service.get_accounts(account_ids),
    )?;

    let group: GetTransactionGroupLineResponseViewModel = result.try_into()?;

    Ok((
        StatusCode::CREATED,
        Json(AddTransactionGroupResponseViewModel {
            group: group.transaction_group,
            metadata: MetadataLookupTables {
                assets: assets.into_iter().map_into().collect(),
                accounts: accounts.into_iter().map_into().collect(),
                ..Default::default()
            },
        }),
    ))
}

/// Group individual transactions
///
/// Creates a new transaction group from existing individual transactions.
/// The provided transaction IDs will be moved from individual to the new group.
#[utoipa::path(
    put,
    path = "/api/users/{user_id}/transactions/groups",
    tag = "Transaction Groups",
    request_body (
      content = UpdateTransactionGroupRequestViewModel,
    ),
    responses(
        (status = 201, description = "Transaction group created successfully.", body = AddTransactionGroupResponseViewModel),
        CreateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User Id for which to create the transaction group."),
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn group_individual_transactions(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    TransactionGroupServiceState(service): TransactionGroupServiceState,
    AssetsServiceState(asset_service): AssetsServiceState,
    AccountsServiceState(accounts_service): AccountsServiceState,
    ValidatedJson(params): ValidatedJson<UpdateTransactionGroupRequestViewModel>,
) -> Result<(StatusCode, Json<AddTransactionGroupResponseViewModel>), ApiError> {
    params.group.validate()?;

    let transaction_dtos: Vec<TransactionDto> = params
        .group
        .transactions
        .into_iter()
        .map(Into::into)
        .collect();

    let result = service
        .group_individual_transactions(
            user_id,
            params.group.description.into_inner(),
            params.group.category_id.0,
            params.group.date,
            transaction_dtos,
        )
        .await
        .map_err(ApiError::from_anyhow)?;

    let tx_refs: Vec<_> = result.transactions.iter().collect();
    let asset_ids = transaction_dtos_to_asset_ids_hashset(&tx_refs);
    let account_ids = transaction_dtos_to_account_ids_hashset(&tx_refs);

    let (assets, accounts) = tokio::try_join!(
        asset_service.get_assets(asset_ids),
        accounts_service.get_accounts(account_ids),
    )?;

    let group: GetTransactionGroupLineResponseViewModel = result.try_into()?;

    Ok((
        StatusCode::CREATED,
        Json(AddTransactionGroupResponseViewModel {
            group: group.transaction_group,
            metadata: MetadataLookupTables {
                assets: assets.into_iter().map_into().collect(),
                accounts: accounts.into_iter().map_into().collect(),
                ..Default::default()
            },
        }),
    ))
}

/// Update existing
///
/// If the transactions array is updated with an existing transaction id, that transaction will
/// be moved from individual to a group.
#[utoipa::path(
    put,
    path = "/api/users/{user_id}/transactions/groups/{group_id}",
    tag = "Transaction Groups",
    request_body (
      content = UpdateTransactionGroupRequestViewModel,
    ),
    responses(
        (status = 200, description = "Transaction group updated successfully.", body = UpdateTransactionGroupResponseViewModel),
        UpdateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transaction group belongs to."),
        ("group_id" = Uuid, Path, description = "The id of the transaction group which is being updated."),
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn update_transaction_group(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(GroupIdPath { group_id }): Path<GroupIdPath>,
    TransactionGroupServiceState(service): TransactionGroupServiceState,
    AssetsServiceState(asset_service): AssetsServiceState,
    AccountsServiceState(accounts_service): AccountsServiceState,
    ValidatedJson(params): ValidatedJson<UpdateTransactionGroupRequestViewModel>,
) -> Result<Json<UpdateTransactionGroupResponseViewModel>, ApiError> {
    params.group.validate()?;

    let transaction_dtos: Vec<TransactionDto> = params
        .group
        .transactions
        .into_iter()
        .map(Into::into)
        .collect();

    let result = service
        .update_transaction_group(
            user_id,
            group_id,
            params.group.description.into_inner(),
            params.group.category_id.0,
            params.group.date,
            transaction_dtos,
        )
        .await
        .map_err(ApiError::from_anyhow)?;

    let tx_refs: Vec<_> = result.transactions.iter().collect();
    let asset_ids = transaction_dtos_to_asset_ids_hashset(&tx_refs);
    let account_ids = transaction_dtos_to_account_ids_hashset(&tx_refs);

    let (assets, accounts) = tokio::try_join!(
        asset_service.get_assets(asset_ids),
        accounts_service.get_accounts(account_ids),
    )?;

    let group: GetTransactionGroupLineResponseViewModel = result.try_into()?;

    Ok(Json(UpdateTransactionGroupResponseViewModel {
        group: group.transaction_group.group,
        metadata: MetadataLookupTables {
            assets: assets.into_iter().map_into().collect(),
            accounts: accounts.into_iter().map_into().collect(),
            ..Default::default()
        },
    }))
}

/// Delete existing
///
/// Deletes the entire transaction group and associated transactions within it.
#[utoipa::path(
    delete,
    path = "/api/users/{user_id}/transactions/groups/{group_id}",
    tag = "Transaction Groups",
    operation_id = "Delete an existing transaction group.",
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transaction group belongs to."),
        ("group_id" = Uuid, Path, description = "The Id of the transaction group to be deleted."),
    ),
    responses(
        (status = 200, description = "Transaction group deleted successfully."),
        DeleteResponses
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn delete_transaction_group(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(GroupIdPath { group_id }): Path<GroupIdPath>,
    TransactionGroupServiceState(service): TransactionGroupServiceState,
) -> Result<(), ApiError> {
    service
        .delete_transaction_group(user_id, group_id)
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok(())
}

/// Get all
///
/// Retrieves a paginated list of transaction groups
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/transactions/groups",
    tag = "Transaction Groups",
    responses(
        (status = 200, description = "Transaction groups retrieved successfully.", body = TransactionGroupsPage),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transaction group belongs to."),
        CursorOrPaginatedSearchQuery
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_transaction_groups(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    ValidatedQuery(query_params): ValidatedQuery<CursorOrPaginatedSearchQuery>,
    TransactionGroupServiceState(service): TransactionGroupServiceState,
    AssetsServiceState(asset_service): AssetsServiceState,
    AccountsServiceState(accounts_service): AccountsServiceState,
) -> Result<Json<TransactionGroupsPage>, ApiError> {
    let pagination = PaginationModeDto::from(&query_params);

    let result = service
        .get_transaction_groups(user_id, pagination, query_params.query)
        .await?;

    let all_tx_refs: Vec<_> = result
        .results
        .iter()
        .flat_map(|grp| grp.transactions.iter())
        .collect();
    let asset_ids = transaction_dtos_to_asset_ids_hashset(&all_tx_refs);
    let account_ids = transaction_dtos_to_account_ids_hashset(&all_tx_refs);

    let (assets, accounts) = tokio::try_join!(
        asset_service.get_assets(asset_ids),
        accounts_service.get_accounts(account_ids),
    )?;

    let next_cursor = if result.has_more {
        result.next_cursor
    } else {
        None
    };

    let ret = TransactionGroupsPage {
        results: result
            .results
            .into_iter()
            .map(GetTransactionGroupLineResponseViewModel::try_from)
            .collect::<Result<Vec<_>, _>>()?,
        has_more: result.has_more,
        next_cursor,
        total_results: result.total_results,
        lookup_tables: MetadataLookupTables {
            assets: assets.into_iter().map_into().collect(),
            accounts: accounts.into_iter().map_into().collect(),
            ..Default::default()
        },
    };

    Ok(Json(ret))
}
