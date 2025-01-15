#[mockall_double::double]
use dal::database_context::MyraDb;
use itertools::Itertools;
use uuid::Uuid;

use crate::{
    dtos::net_worth::{entries_interval_sum_dto::EntriesIntervalSumDto, range_dto::RangeDto},
    entities::{range::Range, transactions::transaction::Transaction},
};
use dal::{
    models::entry_models::EntriesAssetIntervalSum,
    queries::entries_queries::{self, get_binned_entries},
    query_params::get_binned_entries_params::GetBinnedEntriesParams,
};

pub struct EntriesService {
    #[allow(dead_code)]
    db: MyraDb,
}

impl EntriesService {
    pub fn new(db: MyraDb) -> Self {
        Self { db: db.clone() }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn add_transcation_entries(
        &self,
        transactions: &mut [Transaction],
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

    #[tracing::instrument(skip_all, err)]
    pub async fn get_entries_interval_sums(
        &self,
        user_id: Uuid,
        range: RangeDto,
    ) -> anyhow::Result<impl Iterator<Item = EntriesIntervalSumDto>> {
        let range_ent: Range = range.try_into()?;

        let params = GetBinnedEntriesParams {
            interval: range_ent.interval(),
            user_id,
            start_date: range_ent.start_time(),
        };

        let query = get_binned_entries(params);
        let results: Vec<EntriesAssetIntervalSum> = self.db.fetch_all(query).await?;
        Ok(results.into_iter().map_into())
    }
}
