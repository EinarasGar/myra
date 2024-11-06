use dal::models::{
    transaction_models::AddTransactionModel,
    transaction_with_entries_model::TransactionWithEntriesModel,
};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    dtos::{
        entry_dto::EntryDto,
        fee_entry_dto::FeeEntryDto,
        transaction_dto::{RegularTransactionMetadataDto, TransactionDto, TransactionTypeDto},
    },
    dynamic_enums::{fee_categories::FeeCategories, DynamicEnum},
    entities::{
        categories::fee_categories::is_fee_category,
        entries::entry::Entry,
        transactions::{metadata::MetadataField, transaction::Transaction},
    },
};

use super::TransactionProcessor;

pub struct RegularTransaction {
    user_id: Uuid,
    transaction_id: Option<Uuid>,
    date: OffsetDateTime,
    description: Option<String>,
    entries: Vec<Entry>,
}

impl TransactionProcessor for RegularTransaction {
    fn get_add_transaction_model(&self) -> AddTransactionModel {
        AddTransactionModel {
            user_id: self.user_id,
            group_id: None,
            date: self.date,
            transaction_type_id: 1,
        }
    }

    fn set_transaction_id(&mut self, transaction_id: Uuid) {
        self.transaction_id = Some(transaction_id);
    }

    fn get_entries(&self) -> &Vec<Entry> {
        &self.entries
    }

    fn get_transaction_id(&self) -> Option<Uuid> {
        self.transaction_id
    }

    fn get_entries_mut(&mut self) -> &mut Vec<Entry> {
        &mut self.entries
    }

    fn into_dto(&self) -> TransactionDto {
        let main_entry = self
            .entries
            .iter()
            .find(|x| !is_fee_category(x.category))
            .unwrap();

        let fee_entries: Vec<&Entry> = self
            .entries
            .iter()
            .filter(|x| is_fee_category(x.category))
            .collect();

        TransactionDto {
            transaction_id: self.transaction_id,
            date: self.date,
            transaction_type: TransactionTypeDto::Regular(RegularTransactionMetadataDto {
                description: self.description.clone(),
                entry: EntryDto {
                    entry_id: main_entry.entry_id,
                    asset_id: main_entry.asset_id,
                    quantity: main_entry.quantity,
                    account_id: main_entry.account_id,
                },
                category_id: main_entry.category,
            }),
            fee_entries: fee_entries
                .iter()
                .map(|x| FeeEntryDto {
                    entry: EntryDto {
                        entry_id: x.entry_id,
                        asset_id: x.asset_id,
                        quantity: x.quantity,
                        account_id: x.account_id,
                    },
                    entry_type: FeeCategories::try_from_dynamic_enum(x.category)
                        .expect("this should be handled tbh"),
                })
                .collect(),
        }
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

    fn from_dto(dto: TransactionDto, user_id: Uuid) -> Transaction {
        let metadata = match dto.transaction_type {
            TransactionTypeDto::Regular(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };
        Box::new(RegularTransaction {
            transaction_id: dto.transaction_id,
            date: dto.date,
            description: metadata.description,
            entries: {
                let mut entries = Vec::new();
                entries.push(Entry {
                    entry_id: None,
                    asset_id: metadata.entry.asset_id,
                    quantity: metadata.entry.quantity,
                    account_id: metadata.entry.account_id,
                    category: metadata.category_id,
                });
                entries.append(
                    &mut dto
                        .fee_entries
                        .into_iter()
                        .map(|x| Entry {
                            entry_id: None,
                            asset_id: x.entry.asset_id,
                            quantity: x.entry.quantity,
                            account_id: x.entry.account_id,
                            category: FeeCategories::try_into_dynamic_enum(x.entry_type)
                                .expect("this should be handled tbh"),
                        })
                        .collect::<Vec<Entry>>(),
                );
                entries
            },
            user_id,
        })
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(RegularTransaction {
            transaction_id: Some(models[0].transaction_id),
            date: models[0].date,
            description: None,
            entries: models
                .iter()
                .map(|x| Entry {
                    entry_id: Some(x.id),
                    asset_id: x.asset_id,
                    quantity: x.quantity,
                    account_id: x.account_id,
                    category: x.category_id,
                })
                .collect(),
            user_id: models[0].user_id,
        })
    }
}
