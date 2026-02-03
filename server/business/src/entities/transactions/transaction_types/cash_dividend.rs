use anyhow::{Context, Result};
use dal::{
    enums::{
        transaction_type_categories::DatabaseTransactionTypeCategories,
        transaction_types::DatabaseTransactionTypes,
    },
    models::{
        transaction_models::AddTransactionModel, transaction_models::TransactionWithEntriesModel,
    },
};
use rust_decimal_macros::dec;
use uuid::Uuid;

use crate::{
    dtos::transaction_dto::{CashDividendMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::cash_dividend::CashDividend,
        transactions::{
            base_transaction::BaseTransaction,
            metadata::MetadataField,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct CashDividendTransaction {
    base: BaseTransaction,
    origin_asset_id: Option<i32>,
}

impl TransactionProcessor for CashDividendTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let entry = self.base.entry(|x| x.quantity >= dec!(0))?;

        let metadata = TransactionTypeDto::CashDividend(CashDividendMetadataDto {
            entry: entry.clone().into(),
            origin_asset_id: self.origin_asset_id.unwrap_or(0),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::CashDividend)
    }

    fn set_transaction_id(&mut self, transaction_id: Uuid) {
        self.base.set_transaction_id(transaction_id)
    }

    fn get_entries(&self) -> &Vec<Entry> {
        self.base.entries()
    }

    fn get_transaction_id(&self) -> Option<Uuid> {
        self.base.transaction_id()
    }

    fn get_entries_mut(&mut self) -> &mut Vec<Entry> {
        self.base.entries_mut()
    }

    fn get_metadata_fields(&self) -> Vec<MetadataField> {
        vec![MetadataField::Dividends(self.origin_asset_id)]
    }

    fn set_metadata_fields(&mut self, field: MetadataField) {
        if let MetadataField::Dividends(origin_asset_id) = field {
            self.origin_asset_id = origin_asset_id;
        } else {
            panic!("CashDividend transaction only supports Dividends metadata");
        }
    }

    fn try_from_dto(dto: TransactionDto, user_id: Uuid) -> Result<Transaction> {
        let metadata = match dto.transaction_type {
            TransactionTypeDto::CashDividend(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        let mut base = BaseTransaction::new(user_id, dto.transaction_id, dto.date, vec![]);
        base.add_fee_entries_from_dtos(dto.fee_entries)?;

        let entry = Entry::from_dto(
            metadata.entry,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::CashDividend,
            )
            .context("Failed to convert cash dividend category")?,
        );

        base.add_entries(vec![entry]);

        let ret = Box::new(CashDividendTransaction {
            base,
            origin_asset_id: Some(metadata.origin_asset_id),
        });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(CashDividendTransaction {
            base: BaseTransaction::from_models(models),
            origin_asset_id: None,
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let Some(origin_asset_id) = self.origin_asset_id else {
            tracing::warn!("CashDividend transaction missing origin_asset_id metadata, skipping portfolio action");
            return Ok(TransactionPortfolioAction::None);
        };

        let entry = self.base.entry(|x| x.quantity >= dec!(0))?;

        Ok(TransactionPortfolioAction::Referential(Box::new(
            CashDividend {
                asset_id: entry.asset_id,
                account_id: entry.account_id,
                quantity: entry.quantity,
                origin_asset_id,
                price: dec!(1),
                fees: -self.base.fee_entries_total(),
                date: self.base.date(),
            },
        )))
    }
}
