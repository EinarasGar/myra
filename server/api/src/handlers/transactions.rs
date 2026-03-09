use axum::{extract::Path, Json};
use business::dtos::combined_transaction_dto::CombinedTransactionItem;
use business::dtos::paging_dto::PaginationModeDto;
use business::dtos::transaction_dto::TransactionDto;
use itertools::Itertools;
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    converters::{transaction_dtos_to_account_ids_hashset, transaction_dtos_to_asset_ids_hashset},
    errors::ApiError,
    extractors::{ValidatedJson, ValidatedQuery},
    states::{AccountsServiceState, AssetsServiceState, TransactionManagementServiceState},
    view_models::{
        base_models::search::{
            CursorOrPageOfResults, CursorOrPaginatedSearchQuery,
            CursorPageOfCombinedTransactionsWithLookupViewModel,
        },
        errors::{DeleteResponses, GetResponses, UpdateResponses},
        transactions::{
            base_models::metadata_lookup::MetadataLookupTables,
            get_transactions::CombinedTransactionItemViewModel,
            update_transaction::{
                UpdateTransactionRequestViewModel, UpdateTransactionResponseViewModel,
            },
            validation::Validatable,
        },
    },
};

/// Update existing
///
/// This is a generic update endpoint which does not assume whether transaction is individual or group.
/// It only updates the contents of the transaction without moving it.
#[utoipa::path(
    put,
    path = "/api/users/{user_id}/transactions/{transaction_id}",
    tag = "Transactions",
    operation_id = "Update an existing transaction.",
    request_body (
      content = UpdateTransactionRequestViewModel,
    ),
    responses(
        (status = 200, description = "Transaction updated successfully.", body = UpdateTransactionResponseViewModel),
        UpdateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transaction belongs to."),
        ("transaction_id" = Uuid, Path, description = "The id of the specific transaction to be updated."),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn update_transaction(
    Path((user_id, transaction_id)): Path<(Uuid, Uuid)>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    TransactionManagementServiceState(service): TransactionManagementServiceState,
    AssetsServiceState(asset_service): AssetsServiceState,
    AccountsServiceState(accounts_service): AccountsServiceState,
    ValidatedJson(params): ValidatedJson<UpdateTransactionRequestViewModel>,
) -> Result<Json<UpdateTransactionResponseViewModel>, ApiError> {
    params.transaction.validate()?;

    let dto: TransactionDto = params.transaction.into();

    let result = service
        .update_individual_transaction(user_id, transaction_id, dto)
        .await
        .map_err(ApiError::from_anyhow)?;

    let asset_ids = transaction_dtos_to_asset_ids_hashset(&[&result]);
    let account_ids = transaction_dtos_to_account_ids_hashset(&[&result]);

    let (assets, accounts) = tokio::try_join!(
        asset_service.get_assets(asset_ids),
        accounts_service.get_accounts(account_ids),
    )?;

    Ok(Json(UpdateTransactionResponseViewModel {
        transaction: result.into(),
        metadata: MetadataLookupTables {
            assets: assets.into_iter().map_into().collect(),
            accounts: accounts.into_iter().map_into().collect(),
        },
    }))
}

/// Delete existing
///
/// Deleted any transaction, whether its individual or from a group.
#[utoipa::path(
    delete,
    path = "/api/users/{user_id}/transactions/{transaction_id}",
    tag = "Transactions",
    operation_id = "Delete an existing transaction.",
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transaction belongs to."),
        ("transaction_id" = Uuid, Path, description = "The id of the transaction to be deleted."),
    ),
    responses(
        (status = 200, description = "Transaction deleted successfully."),
        DeleteResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn delete_transaction(
    Path((user_id, transaction_id)): Path<(Uuid, Uuid)>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    TransactionManagementServiceState(service): TransactionManagementServiceState,
) -> Result<(), ApiError> {
    service
        .delete_transactions(user_id, vec![transaction_id])
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok(())
}

/// Get all
///
/// Retrieves a list of all individual and grouped transactions
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/transactions",
    tag = "Transactions",
    responses(
        (status = 200, description = "Transactions retrieved successfully.", body = CursorOrPageOfResults<CombinedTransactionItemViewModel, MetadataLookupTables>),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transaction belongs to."),
        CursorOrPaginatedSearchQuery
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_transactions(
    Path(user_id): Path<Uuid>,
    ValidatedQuery(query_params): ValidatedQuery<CursorOrPaginatedSearchQuery>,
    TransactionManagementServiceState(service): TransactionManagementServiceState,
    AssetsServiceState(asset_service): AssetsServiceState,
    AccountsServiceState(accounts_service): AccountsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<CursorPageOfCombinedTransactionsWithLookupViewModel>, ApiError> {
    let pagination = PaginationModeDto::from(&query_params);

    let result = service
        .get_combined_transactions(user_id, pagination, query_params.query)
        .await?;

    // Build lookup tables from all transactions across all items
    let all_tx_refs: Vec<_> = result
        .results
        .iter()
        .flat_map(|item| match item {
            CombinedTransactionItem::Individual(tx) => vec![tx],
            CombinedTransactionItem::Group(grp) => grp.transactions.iter().collect(),
        })
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

    let ret = CursorPageOfCombinedTransactionsWithLookupViewModel {
        results: result
            .results
            .into_iter()
            .map(CombinedTransactionItemViewModel::try_from)
            .collect::<Result<Vec<_>, _>>()?,
        has_more: result.has_more,
        next_cursor,
        total_results: result.total_results,
        lookup_tables: MetadataLookupTables {
            assets: assets.into_iter().map_into().collect(),
            accounts: accounts.into_iter().map_into().collect(),
        },
    };

    Ok(Json(ret))
}

// #[tracing::instrument(skip_all, err)]
// pub async fn post_transactions_by_group_id(
//     Path((user_id, group_id)): Path<(Uuid, Uuid)>,
//     TransactionServiceState(transaction_service): TransactionServiceState,
//     AuthenticatedUserState(_auth): AuthenticatedUserState,
//     Json(params): Json<UpdateTransactionGroupViewModel>,
// ) -> Result<Json<TransactionGroupListViewModel>, ApiError> {
//     //check id
//     let insert_result = transaction_service
//         .update_transaction_group(user_id, params.clone().into())
//         .await?;

//     if group_id != params.id {
//         //TODO: Need to do proper error handling
//         return Err(AuthError::Unauthorized.into());
//     }

//     let response = TransactionGroupListViewModel {
//         groups: vec![insert_result.into()],
//         assets_lookup_table: Vec::new(),
//     };
//     Ok(response.into())
// }

// #[allow(unused_variables)]
// #[tracing::instrument(skip_all, err)]
// pub async fn delete_transactions_by_group_id(
//     Path((user_id, group_id)): Path<(Uuid, Uuid)>,
//     TransactionServiceState(transaction_service): TransactionServiceState,
//     AuthenticatedUserState(auth): AuthenticatedUserState,
// ) -> Result<(), ApiError> {
//     transaction_service
//         .delete_transaction_group(group_id)
//         .await?;
//     Ok(())
// }

// #[tracing::instrument(skip_all, err)]
// pub async fn get_transactions(
//     Path(user_id): Path<Uuid>,
//     AssetsServiceState(assets_service): AssetsServiceState,
//     TransactionServiceState(transaction_service): TransactionServiceState,
//     AuthenticatedUserState(_auth): AuthenticatedUserState,
// ) -> Result<Json<TransactionGroupListViewModel>, ApiError> {
//     let transactions = transaction_service.get_transaction_groups(user_id).await?;

//     let mut unique_asset_ids: HashSet<i32> = HashSet::new();
//     transactions.iter().for_each(|val| {
//         val.transactions.iter().for_each(|dto| {
//             unique_asset_ids.insert(dto.asset_id);
//         });
//     });

//     let mut assets_lookup_vec: Vec<AssetViewModel> = Vec::new();
//     for asset_id in unique_asset_ids.drain() {
//         let dto = assets_service.get_asset(asset_id).await?;
//         assets_lookup_vec.push(dto.into());
//     }

//     let response = TransactionGroupListViewModel {
//         groups: transactions.iter().map(|val| val.clone().into()).collect(),
//         assets_lookup_table: assets_lookup_vec,
//     };
//     Ok(response.into())
// }
