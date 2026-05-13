use std::collections::HashSet;

use business::dtos::combined_transaction_dto::CombinedTransactionItem;
use business::dtos::transaction_dto::{TransactionDto, TransactionTypeDto};
use dal::query_params::ai_conversation_params::ProposalType;
use uuid::Uuid;
pub fn transaction_dtos_to_asset_ids_hashset(transactions: &[&TransactionDto]) -> HashSet<i32> {
    let mut asset_ids = HashSet::new();
    for transaction in transactions {
        for fee_entry in &transaction.fee_entries {
            asset_ids.insert(fee_entry.entry.asset_id);
        }
        match &transaction.transaction_type {
            TransactionTypeDto::Regular(m) => {
                asset_ids.insert(m.entry.asset_id);
            }
            TransactionTypeDto::AssetPurchase(m) => {
                asset_ids.insert(m.purchase.asset_id);
                asset_ids.insert(m.sale.asset_id);
            }
            TransactionTypeDto::AssetSale(m) => {
                asset_ids.insert(m.sale.asset_id);
                asset_ids.insert(m.proceeds.asset_id);
            }
            TransactionTypeDto::CashTransferIn(m) => {
                asset_ids.insert(m.entry.asset_id);
            }
            TransactionTypeDto::CashTransferOut(m) => {
                asset_ids.insert(m.entry.asset_id);
            }
            TransactionTypeDto::CashDividend(m) => {
                asset_ids.insert(m.entry.asset_id);
            }
            TransactionTypeDto::AssetDividend(m) => {
                asset_ids.insert(m.entry.asset_id);
            }
            TransactionTypeDto::AssetTransferOut(m) => {
                asset_ids.insert(m.entry.asset_id);
            }
            TransactionTypeDto::AssetTransferIn(m) => {
                asset_ids.insert(m.entry.asset_id);
            }
            TransactionTypeDto::AssetTrade(m) => {
                asset_ids.insert(m.outgoing_entry.asset_id);
                asset_ids.insert(m.incoming_entry.asset_id);
            }
            TransactionTypeDto::AssetBalanceTransfer(m) => {
                asset_ids.insert(m.outgoing_change.asset_id);
                asset_ids.insert(m.incoming_change.asset_id);
            }
            TransactionTypeDto::AccountFees(m) => {
                asset_ids.insert(m.entry.asset_id);
            }
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
            TransactionTypeDto::Regular(m) => {
                account_ids.insert(m.entry.account_id);
            }
            TransactionTypeDto::AssetPurchase(m) => {
                account_ids.insert(m.purchase.account_id);
                account_ids.insert(m.sale.account_id);
            }
            TransactionTypeDto::AssetSale(m) => {
                account_ids.insert(m.sale.account_id);
                account_ids.insert(m.proceeds.account_id);
            }
            TransactionTypeDto::CashTransferIn(m) => {
                account_ids.insert(m.entry.account_id);
            }
            TransactionTypeDto::CashTransferOut(m) => {
                account_ids.insert(m.entry.account_id);
            }
            TransactionTypeDto::CashDividend(m) => {
                account_ids.insert(m.entry.account_id);
            }
            TransactionTypeDto::AssetDividend(m) => {
                account_ids.insert(m.entry.account_id);
            }
            TransactionTypeDto::AssetTransferOut(m) => {
                account_ids.insert(m.entry.account_id);
            }
            TransactionTypeDto::AssetTransferIn(m) => {
                account_ids.insert(m.entry.account_id);
            }
            TransactionTypeDto::AssetTrade(m) => {
                account_ids.insert(m.outgoing_entry.account_id);
                account_ids.insert(m.incoming_entry.account_id);
            }
            TransactionTypeDto::AssetBalanceTransfer(m) => {
                account_ids.insert(m.outgoing_change.account_id);
                account_ids.insert(m.incoming_change.account_id);
            }
            TransactionTypeDto::AccountFees(m) => {
                account_ids.insert(m.entry.account_id);
            }
        }
    }
    account_ids
}

pub fn transaction_dtos_to_category_ids_hashset(transactions: &[&TransactionDto]) -> HashSet<i32> {
    let mut category_ids = HashSet::new();
    for transaction in transactions {
        if let TransactionTypeDto::Regular(m) = &transaction.transaction_type {
            category_ids.insert(m.category_id);
        }
    }
    category_ids
}

pub fn extract_ids_from_proposal(
    proposal_type: Option<&ProposalType>,
    proposal_data: Option<&serde_json::Value>,
) -> (HashSet<Uuid>, HashSet<i32>, HashSet<i32>) {
    let mut account_ids: HashSet<Uuid> = HashSet::new();
    let mut asset_ids: HashSet<i32> = HashSet::new();
    let mut category_ids: HashSet<i32> = HashSet::new();

    let Some(data) = proposal_data else {
        return (account_ids, asset_ids, category_ids);
    };

    let extract_single = |data: &serde_json::Value,
                          account_ids: &mut HashSet<Uuid>,
                          asset_ids: &mut HashSet<i32>,
                          category_ids: &mut HashSet<i32>| {
        if let Some(id_str) = data["account_id"].as_str() {
            if let Ok(id) = Uuid::parse_str(id_str) {
                account_ids.insert(id);
            }
        }
        if let Some(id) = data["asset_id"].as_i64() {
            asset_ids.insert(id as i32);
        }
        if let Some(id) = data["category_id"].as_i64() {
            category_ids.insert(id as i32);
        }
    };

    match proposal_type {
        Some(ProposalType::TransactionGroup) => {
            if let Some(id) = data["category_id"].as_i64() {
                category_ids.insert(id as i32);
            }
            if let Some(transactions) = data["transactions"].as_array() {
                for txn in transactions {
                    extract_single(txn, &mut account_ids, &mut asset_ids, &mut category_ids);
                }
            }
        }
        _ => {
            extract_single(data, &mut account_ids, &mut asset_ids, &mut category_ids);
        }
    }

    (account_ids, asset_ids, category_ids)
}

pub fn combined_items_to_category_ids_hashset(items: &[CombinedTransactionItem]) -> HashSet<i32> {
    let mut category_ids = HashSet::new();
    for item in items {
        match item {
            CombinedTransactionItem::Individual(tx) => {
                if let TransactionTypeDto::Regular(m) = &tx.transaction_type {
                    category_ids.insert(m.category_id);
                }
            }
            CombinedTransactionItem::Group(grp) => {
                category_ids.insert(grp.category_id);
                for tx in &grp.transactions {
                    if let TransactionTypeDto::Regular(m) = &tx.transaction_type {
                        category_ids.insert(m.category_id);
                    }
                }
            }
        }
    }
    category_ids
}
