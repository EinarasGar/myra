use std::collections::HashSet;

use business::dtos::combined_transaction_dto::CombinedTransactionItem;
use business::dtos::transaction_dto::{TransactionDto, TransactionTypeDto};
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
