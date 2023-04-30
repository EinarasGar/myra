use std::collections::HashSet;

use axum::{extract::Path, Json};

use tracing::log::trace;
use uuid::Uuid;

use crate::{
    app_error::AppError,
    states::{AssetsServiceState, TransactionServiceState},
    view_models::{
        asset_view_model::AssetViewModel,
        transaction_view_model::{
            add_transaction_view_model::AddTransactionGroupViewModel,
            get_tramscaton_view_model::TransactionGroupListRespData,
        },
    },
};

pub async fn post_transactions(
    Path(id): Path<Uuid>,
    TransactionServiceState(transaction_service): TransactionServiceState,
    Json(params): Json<AddTransactionGroupViewModel>,
) -> Result<Json<TransactionGroupListRespData>, AppError> {
    trace!("POST /users/{}/transactions was called - {:?}", id, params);

    let insert_result = transaction_service
        .add_transaction_group(id, params.clone().into())
        .await?;

    let response = TransactionGroupListRespData {
        groups: vec![insert_result.into()],
        assets_lookup_table: Vec::new(),
    };
    Ok(response.into())
}

pub async fn get_transactions(
    Path(id): Path<Uuid>,
    AssetsServiceState(assets_service): AssetsServiceState,
    TransactionServiceState(transaction_service): TransactionServiceState,
) -> Result<Json<TransactionGroupListRespData>, AppError> {
    trace!("GET /users/{}/transactions was called", id);

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

    let response = TransactionGroupListRespData {
        groups: transactions.iter().map(|val| val.clone().into()).collect(),
        assets_lookup_table: assets_lookup_vec,
    };
    Ok(response.into())
}
