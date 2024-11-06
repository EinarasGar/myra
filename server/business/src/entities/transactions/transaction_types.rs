use std::collections::HashMap;

use asset_purhcase::AssetPurchaseTransaction;
use dal::{
    enums::transaction_types::DatabaseTransactionTypes,
    models::transaction_with_entries_model::TransactionWithEntriesModel,
};
use uuid::Uuid;

use crate::dtos::transaction_dto::TransactionDto;

use self::regular_transaction::RegularTransaction;

use super::transaction::{Transaction, TransactionProcessor};

pub mod asset_purhcase;
pub mod regular_transaction;

pub enum TransactionTypes {
    RegularTransaction,
    CashTransferOut,
    CashTransferIn,
    CashDividend,
    AssetTransferOut,
    AssetTransferIn,
    AssetTrade,
    AssetSale,
    AssetPurchase,
    AssetDividend,
    AssetBalanceTransfer,
    AccountFees,
}

impl From<DatabaseTransactionTypes> for TransactionTypes {
    fn from(value: DatabaseTransactionTypes) -> Self {
        match value {
            DatabaseTransactionTypes::RegularTransaction => TransactionTypes::RegularTransaction,
            DatabaseTransactionTypes::CashTransferOut => TransactionTypes::CashTransferOut,
            DatabaseTransactionTypes::CashTransferIn => TransactionTypes::CashTransferIn,
            DatabaseTransactionTypes::CashDividend => TransactionTypes::CashDividend,
            DatabaseTransactionTypes::AssetTransferOut => TransactionTypes::AssetTransferOut,
            DatabaseTransactionTypes::AssetTransferIn => TransactionTypes::AssetTransferIn,
            DatabaseTransactionTypes::AssetTrade => TransactionTypes::AssetTrade,
            DatabaseTransactionTypes::AssetSale => TransactionTypes::AssetSale,
            DatabaseTransactionTypes::AssetPurchase => TransactionTypes::AssetPurchase,
            DatabaseTransactionTypes::AssetDividend => TransactionTypes::AssetDividend,
            DatabaseTransactionTypes::AssetBalanceTransfer => {
                TransactionTypes::AssetBalanceTransfer
            }
            DatabaseTransactionTypes::AccountFees => TransactionTypes::AccountFees,
        }
    }
}

fn get_dto_constructor(
    choice: TransactionTypes,
) -> &'static dyn Fn(TransactionDto, Uuid) -> Transaction {
    match choice {
        TransactionTypes::RegularTransaction => &RegularTransaction::from_dto,
        TransactionTypes::AssetPurchase => &AssetPurchaseTransaction::from_dto,
        TransactionTypes::CashTransferOut => todo!(),
        TransactionTypes::CashTransferIn => todo!(),
        TransactionTypes::CashDividend => todo!(),
        TransactionTypes::AssetTransferOut => todo!(),
        TransactionTypes::AssetTransferIn => todo!(),
        TransactionTypes::AssetTrade => todo!(),
        TransactionTypes::AssetSale => todo!(),
        TransactionTypes::AssetDividend => todo!(),
        TransactionTypes::AssetBalanceTransfer => todo!(),
        TransactionTypes::AccountFees => todo!(),
    }
}

fn get_model_constructor(
    choice: TransactionTypes,
) -> &'static dyn Fn(Vec<TransactionWithEntriesModel>) -> Transaction {
    match choice {
        TransactionTypes::RegularTransaction => {
            &RegularTransaction::from_transaction_with_entries_models
        }
        TransactionTypes::AssetPurchase => {
            &AssetPurchaseTransaction::from_transaction_with_entries_models
        }
        TransactionTypes::CashTransferOut => todo!(),
        TransactionTypes::CashTransferIn => todo!(),
        TransactionTypes::CashDividend => todo!(),
        TransactionTypes::AssetTransferOut => todo!(),
        TransactionTypes::AssetTransferIn => todo!(),
        TransactionTypes::AssetTrade => todo!(),
        TransactionTypes::AssetSale => todo!(),
        TransactionTypes::AssetDividend => todo!(),
        TransactionTypes::AssetBalanceTransfer => todo!(),
        TransactionTypes::AccountFees => todo!(),
    }
}

pub fn create_transaction_from_dto(value: TransactionDto, user_id: Uuid) -> Transaction {
    let constructor = get_dto_constructor(value.clone().transaction_type.into());
    constructor(value, user_id)
}

pub fn create_transaction_from_transaction_with_entries_model(
    value: Vec<TransactionWithEntriesModel>,
) -> anyhow::Result<Transaction> {
    // check if all models have same type_id
    if value.is_empty() {
        return Err(anyhow::anyhow!("No transaction with entries model found"));
    }
    let is_same = value.iter().all(|x| x.type_id == value[0].type_id);
    if !is_same {
        return Err(anyhow::anyhow!(
            "All transaction with entries model should have same type_id"
        ));
    }

    let type_id = value[0].type_id;

    let constructor = get_model_constructor(type_id.into());
    let transaction = constructor(value);
    Ok(transaction)
}

pub fn create_transactions_from_transaction_with_entries_models(
    models: Vec<TransactionWithEntriesModel>,
) -> anyhow::Result<Vec<Transaction>> {
    // split vector into multiple by transaction_id
    let grouped_results_full: Vec<Vec<TransactionWithEntriesModel>> = models
        .into_iter()
        .fold(
            HashMap::new(),
            |mut acc: HashMap<Uuid, Vec<TransactionWithEntriesModel>>, model| {
                acc.entry(model.transaction_id).or_default().push(model);
                acc
            },
        )
        .into_values()
        .collect();

    let transactions: Vec<Transaction> = grouped_results_full
        .into_iter()
        .map(create_transaction_from_transaction_with_entries_model)
        .collect::<Result<_, _>>()?;

    Ok(transactions)
}
