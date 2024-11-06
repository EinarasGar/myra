use dal::models::{
    transaction_models::AddTransactionModel,
    transaction_with_entries_model::TransactionWithEntriesModel,
};
use uuid::Uuid;

use crate::{dtos::transaction_dto::TransactionDto, entities::entries::entry::Entry};

use super::metadata::MetadataField;

pub trait TransactionProcessor {
    #[allow(clippy::wrong_self_convention)]
    fn into_dto(&self) -> TransactionDto;
    fn from_dto(dto: TransactionDto, user_id: Uuid) -> Transaction
    where
        Self: Sized;
    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction
    where
        Self: Sized;
    fn get_metadata_fields(&self) -> Vec<MetadataField>;
    fn set_metadata_fields(&mut self, field: MetadataField);
    fn get_entries(&self) -> &Vec<Entry>;
    fn get_add_transaction_model(&self) -> AddTransactionModel;
    fn get_entries_mut(&mut self) -> &mut Vec<Entry>;
    fn get_transaction_id(&self) -> Option<Uuid>;
    fn set_transaction_id(&mut self, transaction_id: Uuid);
}

/// A boxed trait object for a transaction processor
pub type Transaction = Box<dyn TransactionProcessor + Send>;
