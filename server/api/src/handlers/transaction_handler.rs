use axum::{extract::Path, Json};
use std::collections::HashSet;
use uuid::Uuid;

use crate::{
    app_error::AppError,
    states::{AssetsServiceState, TransactionServiceState},
    view_models::{
        asset_view_model::AssetViewModel,
        transaction_view_model::{
            add_transaction_view_model::AddTransactionGroupViewModel,
            get_tramscaton_view_model::TransactionGroupListViewModel,
        },
    },
};

#[tracing::instrument(skip(transaction_service), ret, err)]
pub async fn post_transactions(
    Path(id): Path<Uuid>,
    TransactionServiceState(transaction_service): TransactionServiceState,
    Json(params): Json<AddTransactionGroupViewModel>,
) -> Result<Json<TransactionGroupListViewModel>, AppError> {
    let insert_result = transaction_service
        .add_transaction_group(id, params.clone().into())
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
