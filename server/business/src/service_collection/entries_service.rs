#[mockall_double::double]
use dal::database_context::MyraDb;
use itertools::Itertools;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    dtos::net_worth::entries_interval_sum_dto::EntriesIntervalSumDto,
    entities::{entries::entry::Entry, range::Range, transactions::transaction::Transaction},
};
use dal::{
    models::{
        entry_models::{AddEntryModel, EntriesAssetIntervalSum},
        transaction_models::UpdateEntryModel,
    },
    queries::{
        entries_queries::{self, get_binned_entries, get_oldest_entry_date},
        transaction_data_queries,
    },
    query_params::get_binned_entries_params::GetBinnedEntriesParams,
};

pub struct EntriesService {
    #[allow(dead_code)]
    db: MyraDb,
}

impl EntriesService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            db: providers.db.clone(),
        }
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

    pub async fn update_transaction_entries(
        &self,
        transaction_id: Uuid,
        old_entries: &[Entry],
        new_entries: &mut [Entry],
    ) -> anyhow::Result<()> {
        let old_by_id: std::collections::HashMap<i32, &Entry> = old_entries
            .iter()
            .filter_map(|e| e.entry_id.map(|id| (id, e)))
            .collect();

        // Entries with an ID that exists in old → update if changed
        // Entries with an ID that doesn't exist in old → treat as new
        // Entries without an ID → insert
        let mut retained_ids = std::collections::HashSet::new();
        let mut to_insert = Vec::new();

        for new_entry in new_entries.iter_mut() {
            if let Some(entry_id) = new_entry.entry_id {
                if let Some(old_entry) = old_by_id.get(&entry_id) {
                    retained_ids.insert(entry_id);
                    if !old_entry.content_eq(new_entry) {
                        let update_model = UpdateEntryModel {
                            asset_id: new_entry.asset_id,
                            account_id: new_entry.account_id,
                            quantity: new_entry.quantity,
                            category_id: new_entry.category,
                        };
                        let query = transaction_data_queries::update_entry(entry_id, update_model);
                        self.db.execute(query).await?;
                    }
                } else {
                    // ID doesn't exist in old entries — treat as new
                    to_insert.push(new_entry);
                }
            } else {
                to_insert.push(new_entry);
            }
        }

        // Delete old entries whose IDs are no longer present
        let ids_to_delete: Vec<i32> = old_by_id
            .keys()
            .filter(|id| !retained_ids.contains(id))
            .copied()
            .collect();
        if !ids_to_delete.is_empty() {
            let query = transaction_data_queries::delete_entries_by_ids(ids_to_delete);
            self.db.execute(query).await?;
        }

        // Insert new entries
        if !to_insert.is_empty() {
            let add_models: Vec<AddEntryModel> = to_insert
                .iter()
                .map(|e| e.get_add_entry_model(transaction_id))
                .collect();
            let query = entries_queries::insert_entries(add_models);
            let new_ids: Vec<i32> = self.db.fetch_all_scalar(query).await?;
            for (entry, id) in to_insert.into_iter().zip(new_ids) {
                entry.set_entry_id(id);
            }
        }

        Ok(())
    }

    pub async fn delete_entries_by_transaction_ids(
        &self,
        transaction_ids: &[Uuid],
    ) -> anyhow::Result<()> {
        if transaction_ids.is_empty() {
            return Ok(());
        }
        let query =
            transaction_data_queries::delete_entries_by_transaction_ids(transaction_ids.to_vec());
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub(crate) async fn get_entries_interval_sums(
        &self,
        user_id: Uuid,
        range: Range,
        account_id: Option<Uuid>,
        apply_ownership_share: bool,
    ) -> anyhow::Result<impl Iterator<Item = EntriesIntervalSumDto>> {
        let start_time_for_binned = (!range.infinite_start()).then(|| range.start_time());

        let params = GetBinnedEntriesParams {
            interval: range.interval(),
            user_id,
            start_date: start_time_for_binned,
            account_id,
            apply_ownership_share,
        };

        let query = get_binned_entries(params);
        let results: Vec<EntriesAssetIntervalSum> = self.db.fetch_all(query).await?;
        Ok(results.into_iter().map_into())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_oldest_entry_date(
        &self,
        user_id: Uuid,
        account_id: Option<Uuid>,
    ) -> anyhow::Result<Option<OffsetDateTime>> {
        let query = get_oldest_entry_date(user_id, account_id);
        Ok(self.db.fetch_one_scalar(query).await?)
    }
}
