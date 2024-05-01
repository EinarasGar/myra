use std::collections::HashMap;

use dal::models::transaction_with_entries_model::TransactionWithEntriesModel;
use uuid::Uuid;

use crate::dtos::transaction_dto::{TransactionDto, TransactionTypeDto};

use self::regular_transaction::RegularTransaction;

use super::transaction::{Transaction, Transcation};

pub mod asset_purhcase;
pub mod regular_transaction;

pub fn create_transaction_from_dto(value: TransactionDto, user_id: Uuid) -> Transaction {
    match value.clone().transaction_type {
        TransactionTypeDto::Regular(m) => RegularTransaction::from_dto(value, user_id, m),
        TransactionTypeDto::AssetPurchase => todo!(),
    }
}

pub fn create_transaction_from_transaction_with_entries_model(
    value: Vec<TransactionWithEntriesModel>,
) -> anyhow::Result<Box<dyn Transcation + Send>> {
    // check if all models have same type_id
    if value.is_empty() {
        return Err(anyhow::anyhow!("No transaction with entries model found"));
    }
    let isSame = value.iter().all(|x| x.type_id == value[0].type_id);
    if !isSame {
        return Err(anyhow::anyhow!(
            "All transaction with entries model should have same type_id"
        ));
    }

    let type_id = value[0].type_id;

    let transaction = match type_id {
        1 => RegularTransaction::from_transaction_with_entries_models(value),
        _ => todo!(),
    };
    Ok(transaction)
}

pub fn create_transactions_from_transaction_with_entries_models(
    models: Vec<TransactionWithEntriesModel>,
) -> anyhow::Result<Vec<Transaction>> {
    // split vector into multiple by transaction_id
    let grouped_results_full: Vec<Vec<TransactionWithEntriesModel>> = models
        .into_iter()
        .fold(HashMap::new(), |mut acc, model| {
            acc.entry(model.transaction_id)
                .or_insert_with(Vec::new)
                .push(model);
            acc
        })
        .into_values()
        .collect();

    let transactions: Vec<Transaction> = grouped_results_full
        .into_iter()
        .map(|group| create_transaction_from_transaction_with_entries_model(group))
        .collect::<Result<_, _>>()?;

    Ok(transactions)
}
