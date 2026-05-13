use shared::view_models::transactions::add_transaction_group::AddTransactionGroupRequestViewModel;
use shared::view_models::transactions::base_models::category_id::RequiredCategoryId;
use shared::view_models::transactions::base_models::description::Description;
use shared::view_models::transactions::base_models::transaction_group::TransactionGroupInput;
use shared::view_models::transactions::transaction_types::TransactionWithEntries;
use time::OffsetDateTime;

use crate::error::ApiError;
use crate::models::CreateTransactionGroupInput;

use super::create_transaction;

pub fn build_create_group_request_body(
    input: CreateTransactionGroupInput,
) -> Result<String, ApiError> {
    let date = OffsetDateTime::from_unix_timestamp(input.date).map_err(|e| ApiError::Parse {
        reason: format!("invalid date: {e}"),
    })?;

    let mut transactions: Vec<TransactionWithEntries> =
        Vec::with_capacity(input.transactions.len());
    for mut child in input.transactions {
        if child.category_id.is_none() && child.type_key == "regular" {
            child.category_id = Some(input.category_id);
        }
        transactions.push(create_transaction::build_transaction(child)?);
    }

    let request = AddTransactionGroupRequestViewModel {
        group: TransactionGroupInput {
            transactions,
            description: Description::from_trusted(input.description),
            category_id: RequiredCategoryId(input.category_id),
            date,
        },
    };

    serde_json::to_string(&request).map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })
}
