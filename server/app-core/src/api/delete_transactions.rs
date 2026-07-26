use shared::view_models::transactions::delete_transactions::DeleteTransactionsRequestViewModel;
use uuid::Uuid;

use crate::error::ApiError;

pub fn build_delete_transactions_request_body(
    transaction_ids: Vec<String>,
    group_ids: Vec<String>,
) -> Result<String, ApiError> {
    let request = DeleteTransactionsRequestViewModel {
        transaction_ids: parse_ids(transaction_ids, "transaction_id")?,
        group_ids: parse_ids(group_ids, "group_id")?,
    };
    serde_json::to_string(&request).map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })
}

fn parse_ids(ids: Vec<String>, field: &str) -> Result<Vec<Uuid>, ApiError> {
    ids.into_iter()
        .map(|id| {
            Uuid::parse_str(&id).map_err(|e| ApiError::Parse {
                reason: format!("invalid {field} '{id}': {e}"),
            })
        })
        .collect()
}
