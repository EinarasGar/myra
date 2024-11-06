use dal::{
    enums::{
        transaction_type_categories::DatabaseTransactionTypeCategories,
        transaction_types::DatabaseTransactionTypes,
    },
    models::{
        transaction_models::AddTransactionModel,
        transaction_with_entries_model::TransactionWithEntriesModel,
    },
};
use rust_decimal_macros::dec;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::{
    dtos::{
        entry_dto::EntryDto,
        fee_entry_dto::FeeEntryDto,
        transaction_dto::{AssetPurchaseMetadataDto, TransactionDto, TransactionTypeDto},
    },
    dynamic_enums::{
        fee_categories::FeeCategories, transaction_type_categories::TransactionTypeCategories,
        DynamicEnum,
    },
    entities::{
        categories::fee_categories::is_fee_category,
        entries::entry::Entry,
        transactions::{metadata::MetadataField, transaction::Transaction},
    },
};

use super::TransactionProcessor;

pub struct AssetPurchaseTransaction {
    user_id: Uuid,
    transaction_id: Option<Uuid>,
    date: OffsetDateTime,
    entries: Vec<Entry>,
}

impl TransactionProcessor for AssetPurchaseTransaction {
    fn into_dto(&self) -> TransactionDto {
        let purchase_entry = self
            .entries
            .iter()
            .find(|x| !is_fee_category(x.category) && x.quantity > dec!(0))
            .unwrap();

        let sale_entry = self
            .entries
            .iter()
            .find(|x| !is_fee_category(x.category) && x.quantity <= dec!(0))
            .unwrap();

        let fee_entries: Vec<&Entry> = self
            .entries
            .iter()
            .filter(|x| is_fee_category(x.category))
            .collect();

        TransactionDto {
            transaction_id: self.transaction_id,
            date: self.date,
            transaction_type: TransactionTypeDto::AssetPurchase(AssetPurchaseMetadataDto {
                purchase: EntryDto {
                    entry_id: purchase_entry.entry_id,
                    asset_id: purchase_entry.asset_id,
                    quantity: purchase_entry.quantity,
                    account_id: purchase_entry.account_id,
                },
                sale: EntryDto {
                    entry_id: sale_entry.entry_id,
                    asset_id: sale_entry.asset_id,
                    quantity: sale_entry.quantity,
                    account_id: sale_entry.account_id,
                },
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
                    entry_type:
                        crate::dynamic_enums::fee_categories::FeeCategories::try_from_dynamic_enum(
                            x.category,
                        )
                        .expect("this should be handled tbh"),
                })
                .collect(),
        }
    }

    fn get_metadata_fields(&self) -> Vec<MetadataField> {
        vec![]
    }

    fn set_metadata_fields(&mut self, _field: MetadataField) {
        panic!("Asset Purcahse does not have metadata fields.")
    }

    fn get_entries(&self) -> &Vec<Entry> {
        &self.entries
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        AddTransactionModel {
            user_id: self.user_id,
            group_id: None,
            date: self.date,
            transaction_type_id: DatabaseTransactionTypes::AssetPurchase as i32,
        }
    }

    fn get_entries_mut(&mut self) -> &mut Vec<Entry> {
        &mut self.entries
    }

    fn get_transaction_id(&self) -> Option<Uuid> {
        self.transaction_id
    }

    fn set_transaction_id(&mut self, transaction_id: Uuid) {
        self.transaction_id = Some(transaction_id);
    }

    fn from_dto(dto: TransactionDto, user_id: Uuid) -> Transaction {
        let metadata = match dto.transaction_type {
            TransactionTypeDto::AssetPurchase(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        Box::new(AssetPurchaseTransaction {
            transaction_id: dto.transaction_id,
            date: dto.date,
            entries: {
                let mut entries = Vec::new();
                entries.push(Entry {
                    entry_id: None,
                    asset_id: metadata.purchase.asset_id,
                    quantity: metadata.purchase.quantity,
                    account_id: metadata.purchase.account_id,
                    category: TransactionTypeCategories::try_into_dynamic_enum(
                        DatabaseTransactionTypeCategories::AssetPurchase,
                    )
                    .expect("handle this plss"),
                });
                entries.push(Entry {
                    entry_id: None,
                    asset_id: metadata.sale.asset_id,
                    quantity: metadata.sale.quantity,
                    account_id: metadata.sale.account_id,
                    category: TransactionTypeCategories::try_into_dynamic_enum(
                        DatabaseTransactionTypeCategories::AssetPurchase,
                    )
                    .expect("handle this plss"),
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
        Box::new(AssetPurchaseTransaction {
            transaction_id: Some(models[0].transaction_id),
            date: models[0].date,
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
