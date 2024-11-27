use anyhow::Context;
use dal::models::entry_models::AddEntryModel;
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::{
    dtos::{entry_dto::EntryDto, fee_entry_dto::FeeEntryDto},
    dynamic_enums::{fee_categories::FeeCategories, DynamicEnum},
    entities::categories::fee_categories::is_fee_category,
};

#[derive(Clone, Debug)]
pub struct Entry {
    pub entry_id: Option<i32>,
    pub asset_id: i32,
    pub quantity: Decimal,
    pub account_id: Uuid,
    pub category: i32,
}

impl Entry {
    pub fn new(
        entry_id: Option<i32>,
        asset_id: i32,
        quantity: Decimal,
        account_id: Uuid,
        category: i32,
    ) -> Self {
        Self {
            entry_id,
            asset_id,
            quantity,
            account_id,
            category,
        }
    }

    pub fn get_add_entry_model(&self, transaction_id: Uuid) -> AddEntryModel {
        AddEntryModel {
            asset_id: self.asset_id,
            quantity: self.quantity,
            account_id: self.account_id,
            category_id: self.category,
            transaction_id,
        }
    }

    pub fn set_entry_id(&mut self, entry_id: i32) {
        self.entry_id = Some(entry_id);
    }

    pub(crate) fn is_fee(&self) -> bool {
        is_fee_category(self.category)
    }

    pub fn from_dto(dto: EntryDto, category: i32) -> Self {
        Self {
            entry_id: dto.entry_id,
            asset_id: dto.asset_id,
            quantity: dto.quantity,
            account_id: dto.account_id,
            category: category,
        }
    }
}

impl From<Entry> for EntryDto {
    fn from(entry: Entry) -> Self {
        EntryDto {
            entry_id: entry.entry_id,
            asset_id: entry.asset_id,
            quantity: entry.quantity,
            account_id: entry.account_id,
        }
    }
}

impl TryFrom<Entry> for FeeEntryDto {
    type Error = anyhow::Error;

    fn try_from(value: Entry) -> Result<Self, Self::Error> {
        let entry_type =
            crate::dynamic_enums::fee_categories::FeeCategories::try_from_dynamic_enum(
                value.category,
            )?;
        Ok(FeeEntryDto {
            entry: value.into(),
            entry_type,
        })
    }
}

impl TryFrom<FeeEntryDto> for Entry {
    type Error = anyhow::Error;

    fn try_from(value: FeeEntryDto) -> Result<Self, Self::Error> {
        Ok(Entry {
            entry_id: None,
            asset_id: value.entry.asset_id,
            quantity: value.entry.quantity,
            account_id: value.entry.account_id,
            category: FeeCategories::try_into_dynamic_enum(value.entry_type)
                .context("Failed to convert fee category")?,
        })
    }
}
