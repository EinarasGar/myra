use dal::models::{
    add_entry_model::AddEntryModel,
    transaction_models::{AddTransactionDescriptionModel, AddTransactionModel},
};
use uuid::Uuid;

use crate::{
    dtos::transaction_dto::{TransactionDto, TransactionTypeDto},
    entities::entries::entry::Entry,
};

use super::metadata::MetadataField;

pub trait Transcation {
    fn into_dto(&self) -> TransactionDto;
    fn get_metadata_fields(&self) -> Vec<MetadataField>;
    fn set_metadata_fields(&mut self, field: MetadataField);
    fn get_entries(&self) -> &Vec<Entry>;
    fn get_add_transaction_model(&self) -> AddTransactionModel;
    fn get_entries_mut(&mut self) -> &mut Vec<Entry>;
    fn get_transaction_id(&self) -> Option<Uuid>;
    fn set_transaction_id(&mut self, transaction_id: Uuid);
}

pub type Transaction = Box<dyn Transcation + Send>;
