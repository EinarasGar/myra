use axum::{
    extract::{Path, Query},
    Json,
};
use business::dtos::{paging_dto::PagingDto, transaction_dto::TransactionDto};
use itertools::Itertools;
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    converters::{transaction_dtos_to_account_ids_hashset, transaction_dtos_to_asset_ids_hashset},
    errors::ApiError,
    states::{AccountsServiceState, AssetsServiceState, TransactionManagementServiceState},
    view_models::errors::{CreateResponses, GetResponses, UpdateResponses},
    view_models::{
        base_models::search::{
            PageOfIndividualTransactionsWithLookupViewModel, PageOfResults, PaginatedSearchQuery,
        },
        transactions::{
            add_individual_transaction::{
                AddIndividualTransactionRequestViewModel, AddIndividualTransactionResponseViewModel,
            },
            base_models::metadata_lookup::MetadataLookupTables,
            get_individual_transaction::GetIndividualTransactionViewModel,
            transaction_types::RequiredIdentifiableTransactionWithIdentifiableEntries,
            update_individual_transaction::{
                UpdateIndividualTransactionRequestViewModel,
                UpdateIndividualTransactionResponseViewModel,
            },
        },
    },
};

/// Add new
///
/// Adds a new individual transaction.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/transactions/individual",
    tag = "Individual Transactions",
    request_body (
      content = AddIndividualTransactionRequestViewModel,
    ),
    responses(
        (status = 201, description = "Individual transaction created successfully.", body = AddIndividualTransactionResponseViewModel),
        CreateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User Id for which to add the individual transaction for."),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn add_individual_transaction(
    Path(user_id): Path<Uuid>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    TransactionManagementServiceState(transaction_service): TransactionManagementServiceState,
    Json(params): Json<AddIndividualTransactionRequestViewModel>,
) -> Result<Json<AddIndividualTransactionResponseViewModel>, ApiError> {
    let dto: TransactionDto = params.transaction.into();

    let return_dto = transaction_service
        .add_individual_transaction(user_id, dto)
        .await?;

    let view_model = return_dto.into();

    let ret = AddIndividualTransactionResponseViewModel {
        transaction: view_model,
    };

    Ok(ret.into())
}

/// Update existing
///
/// Performs an update of an individual transaction.
/// If the transaction provided is not individual, it will be moved to individual and removed from other group.
#[utoipa::path(
    put,
    path = "/api/users/{user_id}/transactions/individual/{transaction_id}",
    tag = "Individual Transactions",
    operation_id = "Update an existing individual transaction.",
    request_body (
      content = UpdateIndividualTransactionRequestViewModel,
    ),
    responses(
        (status = 200, description = "Individual transaction updated successfully.", body = UpdateIndividualTransactionResponseViewModel),
        UpdateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for which the individual transaction belongs to."),
        ("transaction_id" = Uuid, Path, description = "The id of the specific individual transaction which is being updated."),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn update_individual_transaction(
    Path((_user_id, _transaction_id)): Path<(Uuid, Uuid)>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(_params): Json<UpdateIndividualTransactionRequestViewModel>,
) -> Result<Json<UpdateIndividualTransactionResponseViewModel>, ApiError> {
    unimplemented!();
}

/// Get all
///
/// Retrieves a list of all individual transactions
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/transactions/individual",
    tag = "Individual Transactions",
    responses(
        (status = 200, description = "Individual transactions retrieved successfully.", body = PageOfResults<RequiredIdentifiableTransactionWithIdentifiableEntries, MetadataLookupTables>),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transactions group belongs to."),
        PaginatedSearchQuery
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_individual_transactions(
    Path(user_id): Path<Uuid>,
    query_params: Query<PaginatedSearchQuery>,
    AssetsServiceState(asset_service): AssetsServiceState,
    TransactionManagementServiceState(transaction_service): TransactionManagementServiceState,
    AccountsServiceState(accounts_service): AccountsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<PageOfIndividualTransactionsWithLookupViewModel>, ApiError> {
    let paging_dto = PagingDto {
        start: query_params.start,
        count: query_params.count,
    };

    let dtos = transaction_service
        .search_transactions(user_id, paging_dto)
        .await?;

    let asset_ids = transaction_dtos_to_asset_ids_hashset(&dtos.results.iter().collect::<Vec<_>>());
    let account_ids =
        transaction_dtos_to_account_ids_hashset(&dtos.results.iter().collect::<Vec<_>>());

    let (assets, accounts) = tokio::try_join!(
        asset_service.get_assets(asset_ids),
        accounts_service.get_accounts(account_ids),
    )?;

    let ret = PageOfIndividualTransactionsWithLookupViewModel {
        results: dtos.results.into_iter().map(Into::into).collect(),
        total_results: dtos.total_results,
        lookup_tables: MetadataLookupTables {
            assets: assets.into_iter().map_into().collect(),
            accounts: accounts.into_iter().map_into().collect(),
        },
    };

    Ok(ret.into())
}

/// Get Single
///
/// Retrieves a single transaction by specified id
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/transactions/individual/{transaction_id}",
    tag = "Individual Transactions",
    responses(
        (status = 200, description = "Individual transaction retrieved successfully.", body = GetIndividualTransactionViewModel),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transactions group belongs to.")
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_single(
    Path((user_id, transaction_id)): Path<(Uuid, Uuid)>,
    TransactionManagementServiceState(transaction_service): TransactionManagementServiceState,
    AssetsServiceState(asset_service): AssetsServiceState,
    AccountsServiceState(accounts_service): AccountsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetIndividualTransactionViewModel>, ApiError> {
    let transaction = transaction_service
        .get_individual_transaction(user_id, transaction_id)
        .await?;

    let asset_ids = transaction_dtos_to_asset_ids_hashset(&[&transaction]);
    let account_ids = transaction_dtos_to_account_ids_hashset(&[&transaction]);
    let view_model = transaction.into();

    let (assets, accounts) = tokio::try_join!(
        asset_service.get_assets(asset_ids),
        accounts_service.get_accounts(account_ids),
    )?;

    let ret = GetIndividualTransactionViewModel {
        transaction: view_model,
        lookup_tables: MetadataLookupTables {
            assets: assets.into_iter().map_into().collect(),
            accounts: accounts.into_iter().map_into().collect(),
        },
    };
    Ok(ret.into())
}
