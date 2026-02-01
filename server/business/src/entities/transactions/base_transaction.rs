use anyhow::Context;
use anyhow::Result;
use dal::{
    enums::transaction_types::DatabaseTransactionTypes,
    models::transaction_models::{AddTransactionModel, TransactionWithEntriesModel},
};
use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::dtos::fee_entry_dto::FeeEntryDto;
use crate::dtos::transaction_dto::TransactionDto;
use crate::dtos::transaction_dto::TransactionTypeDto;
use crate::entities::entries::entry::Entry;

pub struct BaseTransaction {
    user_id: Uuid,
    transaction_id: Option<Uuid>,
    date: OffsetDateTime,
    entries: Vec<Entry>,
}

impl BaseTransaction {
    pub fn new(
        user_id: Uuid,
        transaction_id: Option<Uuid>,
        date: OffsetDateTime,
        entries: Vec<Entry>,
    ) -> Self {
        Self {
            user_id,
            transaction_id,
            date,
            entries,
        }
    }

    pub fn from_models(models: Vec<TransactionWithEntriesModel>) -> Self {
        Self::new(
            models[0].user_id,
            Some(models[0].transaction_id),
            models[0].date_transacted,
            models
                .iter()
                .map(|x| Entry {
                    entry_id: Some(x.id),
                    asset_id: x.asset_id,
                    quantity: x.quantity,
                    account_id: x.account_id,
                    category: x.category_id,
                })
                .collect(),
        )
    }

    pub fn transaction_id(&self) -> Option<Uuid> {
        self.transaction_id
    }
    pub fn set_transaction_id(&mut self, transaction_id: Uuid) {
        self.transaction_id = Some(transaction_id);
    }

    pub fn entries(&self) -> &Vec<Entry> {
        &self.entries
    }

    pub fn entries_mut(&mut self) -> &mut Vec<Entry> {
        &mut self.entries
    }

    pub fn fee_entries_dtos(&self) -> Result<Vec<FeeEntryDto>> {
        self.entries
            .iter()
            .filter(|x| x.is_fee())
            .map(|x| FeeEntryDto::try_from(x.clone()))
            .collect::<Result<Vec<FeeEntryDto>>>()
    }

    pub fn try_into_dto(&self, metadata: TransactionTypeDto) -> Result<TransactionDto> {
        Ok(TransactionDto {
            transaction_id: self.transaction_id,
            date: self.date,
            transaction_type: metadata,
            fee_entries: self.fee_entries_dtos()?,
        })
    }

    pub fn get_add_transaction_model(
        &self,
        transaction_type: DatabaseTransactionTypes,
    ) -> AddTransactionModel {
        AddTransactionModel {
            user_id: self.user_id,
            group_id: None,
            date: self.date,
            transaction_type_id: transaction_type as i32,
        }
    }

    pub fn entry(&self, predicate: impl Fn(&&Entry) -> bool) -> Result<&Entry> {
        self.entries()
            .iter()
            .filter(|x| !x.is_fee())
            .find(predicate)
            .context("Could not find entry")
    }

    pub fn add_entries(&mut self, entries: Vec<Entry>) {
        self.entries_mut().extend(entries);
    }

    pub fn add_fee_entries_from_dtos(&mut self, fee_entries: Vec<FeeEntryDto>) -> Result<()> {
        self.entries_mut().append(
            &mut fee_entries
                .into_iter()
                .map(|x| -> Result<Entry> { x.try_into() })
                .collect::<Result<Vec<Entry>>>()?,
        );
        Ok(())
    }

    pub fn fee_entries_total(&self) -> Decimal {
        self.entries
            .iter()
            .filter(|x| x.is_fee())
            .map(|x| x.quantity)
            .sum()
    }

    pub fn date(&self) -> OffsetDateTime {
        self.date
    }
}
