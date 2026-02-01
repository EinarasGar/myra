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
    dtos::transaction_dto::{AssetPurchaseMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::asset_purchase::AssetPurchase,
        transactions::{
            base_transaction::BaseTransaction,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct AssetPurchaseTransaction {
    base: BaseTransaction,
}

impl TransactionProcessor for AssetPurchaseTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let purchase_entry = self.base.entry(|x| x.quantity > dec!(0))?;
        let sale_entry = self.base.entry(|x| x.quantity <= dec!(0))?;

        let metadata = TransactionTypeDto::AssetPurchase(AssetPurchaseMetadataDto {
            purchase: purchase_entry.clone().into(),
            sale: sale_entry.clone().into(),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::AssetPurchase)
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

    fn try_from_dto(dto: TransactionDto, user_id: Uuid) -> Result<Transaction> {
        let metadata = match dto.transaction_type {
            TransactionTypeDto::AssetPurchase(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        let mut base = BaseTransaction::new(user_id, dto.transaction_id, dto.date, vec![]);
        base.add_fee_entries_from_dtos(dto.fee_entries)?;

        let purchase_entry = Entry::from_dto(
            metadata.purchase,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetPurchase,
            )
            .context("Failed to convert fee category")?,
        );

        let sale_entry = Entry::from_dto(
            metadata.sale,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetPurchase,
            )
            .context("Failed to convert fee category")?,
        );

        base.add_entries(vec![purchase_entry, sale_entry]);

        let ret = Box::new(AssetPurchaseTransaction { base });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(AssetPurchaseTransaction {
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let purchase_entry = self.base.entry(|x| x.quantity > dec!(0))?;
        let sale_entry = self.base.entry(|x| x.quantity <= dec!(0))?;

        tracing::trace!(
            "Processing asset purchase transaction with purchase entry: {:?} and sale entry: {:?}",
            purchase_entry,
            sale_entry
        );
        let fee_total = self.base.fee_entries_total();
        let cash_units = sale_entry.quantity.abs() - fee_total;
        Ok(TransactionPortfolioAction::Referential(Box::new(
            AssetPurchase {
                instrument_asset_id: purchase_entry.asset_id,
                account_id: purchase_entry.account_id,
                instrument_units: purchase_entry.quantity,
                instrument_price: sale_entry.quantity.abs() / purchase_entry.quantity,
                fees: fee_total.abs(),
                cash_asset_id: sale_entry.asset_id,
                cash_units,
                date: self.base.date(),
            },
        )))
    }
}
