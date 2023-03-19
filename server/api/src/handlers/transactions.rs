use std::collections::HashMap;

use axum::{extract::Path, Json};
use log::trace;
use uuid::Uuid;

use crate::{
    app_error::AppError,
    models::transaction::{TransactionGroupRespData, TransactionRespData, TranscationGroupReqData},
    states::TransactionServiceState,
};

pub async fn post_transactions(
    Path(id): Path<Uuid>,
    TransactionServiceState(transaction_service): TransactionServiceState,
    Json(params): Json<TranscationGroupReqData>,
) -> Result<Json<TransactionGroupRespData>, AppError> {
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
    let mut resp_hash_map: HashMap<Uuid, Vec<TransactionRespData>> = HashMap::new();
    resp_hash_map.insert(insert_result.0, resp_transactions);
    let response = TransactionGroupRespData {
        groups: resp_hash_map,
    };
    Ok(response.into())
}
