use std::collections::HashSet;

use business::dtos::transaction_dto::{TransactionDto, TransactionTypeDto};
use uuid::Uuid;
pub fn transaction_dtos_to_asset_ids_hashset(transactions: &[&TransactionDto]) -> HashSet<i32> {
    let mut asset_ids = HashSet::new();
    for transaction in transactions {
        for fee_entry in &transaction.fee_entries {
            asset_ids.insert(fee_entry.entry.asset_id);
        }
        match &transaction.transaction_type {
            TransactionTypeDto::Regular(regular_transaction_metadata) => {
                asset_ids.insert(regular_transaction_metadata.entry.asset_id);
            }
            TransactionTypeDto::AssetPurchase(_) => {}
        }
    }
    asset_ids
}

pub fn transaction_dtos_to_account_ids_hashset(transactions: &[&TransactionDto]) -> HashSet<Uuid> {
    let mut account_ids = HashSet::new();
    for transaction in transactions {
        for fee_entry in &transaction.fee_entries {
            account_ids.insert(fee_entry.entry.account_id);
        }
        match &transaction.transaction_type {
            TransactionTypeDto::Regular(regular_transaction_metadata) => {
                account_ids.insert(regular_transaction_metadata.entry.account_id);
            }
            TransactionTypeDto::AssetPurchase(_) => {}
        }
    }
    account_ids
}
