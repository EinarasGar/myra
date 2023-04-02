use std::collections::{HashMap, HashSet};

use axum::{extract::Path, Json};

use log::trace;
use uuid::Uuid;

use crate::{
    app_error::AppError,
    models::{
        assets::AssetRespData,
        transaction::{
            TransactionGroupListRespData, TransactionGroupRespData, TransactionRespData,
            TranscationGroupReqData,
        },
    },
    states::{AssetsServiceState, TransactionServiceState},
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
    let mut resp_hash_map: HashMap<Uuid, TransactionGroupRespData> = HashMap::new();
    resp_hash_map.insert(
        insert_result.0,
        TransactionGroupRespData {
            transactions: resp_transactions,
            group_description: None,
        },
    );
    let response = TransactionGroupListRespData {
        groups: resp_hash_map,
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
    let mut resp_hash_map: HashMap<Uuid, TransactionGroupRespData> = HashMap::new();
    for (key, val) in transactions.iter() {
        let mut transaction_vec: Vec<TransactionRespData> = Vec::new();
        let owned_trans = val.to_owned();
        for dto in owned_trans.transactions {
            transaction_vec.push(dto.clone().into());
            unique_asset_ids.insert(dto.asset_id);
        }

        resp_hash_map.insert(
            key.to_owned(),
            TransactionGroupRespData {
                transactions: transaction_vec,
                group_description: owned_trans.description,
            },
        );
    }

    let mut assets_lookup_vec: Vec<AssetRespData> = Vec::new();
    for asset_id in unique_asset_ids.drain() {
        let dto = assets_service.get_asset(asset_id).await?;
        assets_lookup_vec.push(dto.into());
    }

    let response = TransactionGroupListRespData {
        groups: resp_hash_map,
        assets_lookup_table: assets_lookup_vec,
    };
    Ok(response.into())
}
