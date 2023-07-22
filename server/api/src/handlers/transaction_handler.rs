use axum::{extract::Path, Json};
use std::collections::HashSet;
use uuid::Uuid;

use crate::{
    app_error::AppError,
    auth::AuthenticatedUserState,
    states::{AssetsServiceState, TransactionServiceState},
    view_models::{
        add_transaction_group_view_model::AddTransactionGroupViewModel,
        asset_view_model::AssetViewModel,
        transaction_group_list_view_model::TransactionGroupListViewModel,
        transaction_group_view_model::TransactionGroupViewModel,
        update_transaction_group_view_model::UpdateTransactionGroupViewModel,
    },
};

#[tracing::instrument(skip(transaction_service), ret, err)]
pub async fn post_transactions(
    Path(user_id): Path<Uuid>,
    TransactionServiceState(transaction_service): TransactionServiceState,
    AuthenticatedUserState(auth): AuthenticatedUserState,
    Json(params): Json<AddTransactionGroupViewModel>,
) -> Result<Json<TransactionGroupListViewModel>, AppError> {
    let insert_result = transaction_service
        .add_transaction_group(user_id, params.clone().into())
        .await?;

    let response = TransactionGroupListViewModel {
        groups: vec![insert_result.into()],
        assets_lookup_table: Vec::new(),
    };
    Ok(response.into())
}

#[tracing::instrument(skip(transaction_service), ret, err)]
pub async fn post_transactions_by_group_id(
    Path((user_id, group_id)): Path<(Uuid, Uuid)>,
    TransactionServiceState(transaction_service): TransactionServiceState,
    AuthenticatedUserState(auth): AuthenticatedUserState,
    Json(params): Json<UpdateTransactionGroupViewModel>,
) -> Result<Json<TransactionGroupListViewModel>, AppError> {
    //check id
    let insert_result = transaction_service
        .update_transaction_group(user_id, params.clone().into())
        .await?;

    let response = TransactionGroupListViewModel {
        groups: vec![insert_result.into()],
        assets_lookup_table: Vec::new(),
    };
    Ok(response.into())
}

#[tracing::instrument(skip(transaction_service, assets_service), ret, err)]
pub async fn get_transactions(
    Path(id): Path<Uuid>,
    AssetsServiceState(assets_service): AssetsServiceState,
    TransactionServiceState(transaction_service): TransactionServiceState,
    AuthenticatedUserState(auth): AuthenticatedUserState,
) -> Result<Json<TransactionGroupListViewModel>, AppError> {
    let transactions = transaction_service.get_transaction_groups(id).await?;

    let mut unique_asset_ids: HashSet<i32> = HashSet::new();
    transactions.iter().for_each(|val| {
        val.transactions.iter().for_each(|dto| {
            unique_asset_ids.insert(dto.asset_id);
        });
    });

    let mut assets_lookup_vec: Vec<AssetViewModel> = Vec::new();
    for asset_id in unique_asset_ids.drain() {
        let dto = assets_service.get_asset(asset_id).await?;
        assets_lookup_vec.push(dto.into());
    }

    let response = TransactionGroupListViewModel {
        groups: transactions.iter().map(|val| val.clone().into()).collect(),
        assets_lookup_table: assets_lookup_vec,
    };
    Ok(response.into())
}
