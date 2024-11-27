use dal::{
    enums::transaction_types::DatabaseTransactionTypes,
    models::transaction_models::{AddTransactionModel, TransactionWithEntriesModel},
};
use uuid::Uuid;

use crate::{
    dtos::transaction_dto::{RegularTransactionMetadataDto, TransactionDto, TransactionTypeDto},
    entities::{
        entries::entry::Entry,
        transactions::{
            base_transaction::BaseTransaction, metadata::MetadataField, transaction::Transaction,
        },
    },
};
use anyhow::Result;

use super::TransactionProcessor;

pub struct RegularTransaction {
    base: BaseTransaction,
    description: Option<String>,
}

impl TransactionProcessor for RegularTransaction {
    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::RegularTransaction)
    }

    fn set_transaction_id(&mut self, transaction_id: Uuid) {
        self.base.set_transaction_id(transaction_id)
    }

    fn get_entries(&self) -> &Vec<Entry> {
        &self.base.entries()
    }

    fn get_transaction_id(&self) -> Option<Uuid> {
        self.base.transaction_id()
    }

    fn get_entries_mut(&mut self) -> &mut Vec<Entry> {
        self.base.entries_mut()
    }

    fn try_into_dto(&self) -> Result<TransactionDto> {
        //do i need to check if there are other entreies? idk
        let main_entry = self.base.entry(|_| true)?;

        let metadata = TransactionTypeDto::Regular(RegularTransactionMetadataDto {
            description: self.description.clone(),
            entry: main_entry.clone().into(),
            category_id: main_entry.category,
        });

        self.base.try_into_dto(metadata)
    }

    fn get_metadata_fields(&self) -> Vec<MetadataField> {
        vec![MetadataField::Description(self.description.clone())]
    }

    fn set_metadata_fields(&mut self, field: MetadataField) {
        if let MetadataField::Description(description) = field {
            self.description = description;
        } else {
            panic!("Regular transaction only supports description metadata");
        }
    }

    fn try_from_dto(dto: TransactionDto, user_id: Uuid) -> Result<Transaction> {
        let metadata = match dto.transaction_type {
            TransactionTypeDto::Regular(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        let mut base = BaseTransaction::new(user_id, dto.transaction_id, dto.date, vec![]);
        base.add_fee_entries_from_dtos(dto.fee_entries)?;

        let entry = Entry::from_dto(metadata.entry, metadata.category_id);

        base.add_entries(vec![entry]);

        let ret = Box::new(RegularTransaction {
            description: metadata.description,
            base,
        });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(RegularTransaction {
            description: None,
            base: BaseTransaction::from_models(models),
        })
    }
}
