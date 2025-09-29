use axum::{extract::Path, Json};
use rust_decimal_macros::dec;
use time::macros::datetime;
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    view_models::{
        accounts::base_models::account_id::RequiredAccountId,
        assets::base_models::asset_id::RequiredAssetId,
        base_models::search::{PageOfResults, PageOfTransactionsWithLookupViewModel},
        errors::{DeleteResponses, GetResponses, UpdateResponses},
        transactions::{
            base_models::{
                account_asset_entry::{
                    AccountAssetEntryViewModel, RequiredIdentifiableAccountAssetEntryViewModel,
                },
                category_id::RequiredCategoryId,
                entry_id::RequiredEntryId,
                metadata_lookup::MetadataLookupTables,
                transaction_base::{
                    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
                    RequiredTransactionBaseWithIdentifiableEntries,
                },
                transaction_id::RequiredTransactionId,
            },
            get_transactions::GetTransactionsResultsViewModel,
            transaction_types::{
                regular_transaction::RequiredIdentifiableRegularTransactionWithIdentifiableEntriesViewModel,
                RequiredIdentifiableTransactionWithIdentifiableEntries,
            },
            update_transaction::{
                UpdateTransactionRequestViewModel, UpdateTransactionResponseViewModel,
            },
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
    Path((_user_id, _transaction_id)): Path<(Uuid, Uuid)>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(_params): Json<UpdateTransactionRequestViewModel>,
) -> Result<Json<UpdateTransactionResponseViewModel>, ApiError> {
    println!("{:#?}", _params);
    unimplemented!();
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
    Path((_user_id, _transaction_id)): Path<(Uuid, Uuid)>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<(), ApiError> {
    unimplemented!();
}

/// Get all
///
/// Retrieves a list of all individual and grouped transactions
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/transactions",
    tag = "Transactions",
    responses(
        (status = 200, description = "Transactions retrieved successfully.", body = PageOfResults<GetTransactionsResultsViewModel, MetadataLookupTables>),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transaction belongs to.")
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_transactions(
    Path(_user_id): Path<Uuid>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<PageOfTransactionsWithLookupViewModel>, ApiError> {
    let model = PageOfTransactionsWithLookupViewModel {
        results: vec![GetTransactionsResultsViewModel {
            individual_transactions: vec![
                RequiredIdentifiableTransactionWithIdentifiableEntries::RegularTransaction(
                    RequiredIdentifiableRegularTransactionWithIdentifiableEntriesViewModel {
                        r#type: Default::default(),
                        category_id: RequiredCategoryId(3),
                        description: None,
                        entry: RequiredIdentifiableAccountAssetEntryViewModel {
                            entry_id: RequiredEntryId(1),
                            entry: AccountAssetEntryViewModel {
                                account_id: RequiredAccountId(Uuid::new_v4()),
                                asset_id: RequiredAssetId(1),
                                amount: dec!(100.0),
                            },
                        },
                        base: RequiredIdentifiableTransactionBaseWithIdentifiableEntries {
                            transaction_id: RequiredTransactionId(Uuid::new_v4()),
                            base: RequiredTransactionBaseWithIdentifiableEntries {
                                date: datetime!(2000-03-22 00:00:00 UTC),
                                fees: None,
                            },
                        },
                    },
                ),
            ],
            transaction_groups: vec![],
        }],
        total_results: 1,
        lookup_tables: MetadataLookupTables {
            assets: vec![],
            accounts: vec![],
        },
    };
    let ret = model.into();
    Ok(ret)
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
