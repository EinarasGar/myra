use std::vec;

#[mockall_double::double]
use dal::database_context::MyraDb;

use dal::models::add_entry_model::AddEntryModel;
use dal::queries::entries_queries;
use rust_decimal_macros::dec;
use time::macros::datetime;
use uuid::Uuid;

use crate::dtos::portfolio_overview_dto::PortfolioOverviewDto;
use crate::entities::entries::entry::Entry;
use crate::entities::portfolio_overview::investment_transaction::asset_purchase::AssetPurchase;
use crate::entities::portfolio_overview::investment_transaction::cash_transfer_in::CashTransferIn;
use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};
use crate::entities::transactions::transaction::{Transaction, Transcation};

#[mockall_double::double]
use super::asset_service::AssetsService;
#[mockall_double::double]
use super::transaction_service::TransactionService;

pub struct EntriesService {
    #[allow(dead_code)]
    db: MyraDb,
}

impl EntriesService {
    pub fn new(db: MyraDb) -> Self {
        Self { db: db.clone() }
    }

    pub async fn add_transcation_entries(
        &self,
        transactions: &mut Vec<Transaction>,
    ) -> anyhow::Result<()> {
        let mut new_entries_models = Vec::new();

        for transaction in transactions.iter() {
            let entries = transaction.get_entries();

            for entry in entries.iter() {
                let add_entry_model =
                    entry.get_add_entry_model(transaction.get_transaction_id().unwrap());
                new_entries_models.push(add_entry_model);
            }
        }

        if !new_entries_models.is_empty() {
            let query = entries_queries::insert_entries(new_entries_models);
            let new_ids: Vec<i32> = self.db.fetch_all_scalar(query).await?;

            let mut index = 0;
            for transaction in transactions.iter_mut() {
                let entries = transaction.get_entries_mut();

                for entry in entries.iter_mut() {
                    entry.set_entry_id(new_ids[index]);
                    index += 1;
                }
            }
        }

        Ok(())
    }
}
