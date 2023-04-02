use std::collections::{HashMap, HashSet};

use axum::{extract::Path, Json};

use log::trace;
use uuid::Uuid;

use crate::{
    app_error::AppError,
    states::{AssetsServiceState, TransactionServiceState},
    view_models::{
        asset_view_model::AssetRespData,
        transaction_view_model::{
            TransactionGroupListRespData, TransactionGroupRespData, TransactionRespData,
            TranscationGroupReqData,
        },
    },
};

pub async fn post_transactions(
    Path(id): Path<Uuid>,
    TransactionServiceState(transaction_service): TransactionServiceState,
    Json(params): Json<TranscationGroupReqData>,
) -> Result<Json<TransactionGroupListRespData>, AppError> {
    trace!("POST /users/{}/transactions was called - {:?}", id, params);

    let mut insert_result = transaction_service
        .add_transaction_group(id, params.clone())
        .await?;

    let mut transactions = params.transactions.clone();
    let mut resp_transactions: Vec<TransactionRespData> = Vec::new();
    while let Some(transaction) = transactions.pop() {
        let id = insert_result.1.pop();
        resp_transactions.push(TransactionRespData {
            transaction_id: id.unwrap(),
            asset_id: transaction.asset_id,
            quantity: transaction.quantity,
            category: transaction.category,
            date: transaction.date,
            description: transaction.description,
        })
    }
    let mut resp_group_vec: Vec<TransactionGroupRespData> = Vec::new();
    resp_group_vec.push(TransactionGroupRespData {
        transactions: resp_transactions,
        group_description: None,
        group_id: insert_result.0,
    });
    let response = TransactionGroupListRespData {
        groups: resp_group_vec,
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
    let mut resp_group_vec: Vec<TransactionGroupRespData> = Vec::new();
    for (key, val) in transactions.iter() {
        let mut transaction_vec: Vec<TransactionRespData> = Vec::new();
        let owned_trans = val.to_owned();
        for dto in owned_trans.transactions {
            transaction_vec.push(dto.clone().into());
            unique_asset_ids.insert(dto.asset_id);
        }

        resp_group_vec.push(TransactionGroupRespData {
            transactions: transaction_vec,
            group_description: owned_trans.description,
            group_id: key.to_owned(),
        });
    }

    let mut assets_lookup_vec: Vec<AssetRespData> = Vec::new();
    for asset_id in unique_asset_ids.drain() {
        let dto = assets_service.get_asset(asset_id).await?;
        assets_lookup_vec.push(dto.into());
    }

    let response = TransactionGroupListRespData {
        groups: resp_group_vec,
        assets_lookup_table: assets_lookup_vec,
    };
    Ok(response.into())
}
