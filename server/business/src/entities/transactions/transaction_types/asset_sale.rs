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
    dtos::transaction_dto::{AssetSaleMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::asset_sale::AssetSale,
        transactions::{
            base_transaction::BaseTransaction,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct AssetSaleTransaction {
    base: BaseTransaction,
}

impl TransactionProcessor for AssetSaleTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let sale_entry = self.base.entry(|x| x.quantity < dec!(0))?;
        let proceeds_entry = self.base.entry(|x| x.quantity >= dec!(0))?;

        let metadata = TransactionTypeDto::AssetSale(AssetSaleMetadataDto {
            sale: sale_entry.clone().into(),
            proceeds: proceeds_entry.clone().into(),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::AssetSale)
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
            TransactionTypeDto::AssetSale(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        let mut base = BaseTransaction::new(user_id, dto.transaction_id, dto.date, vec![]);
        base.add_fee_entries_from_dtos(dto.fee_entries)?;

        let sale_entry = Entry::from_dto(
            metadata.sale,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetSale,
            )
            .context("Failed to convert sale category")?,
        );

        let proceeds_entry = Entry::from_dto(
            metadata.proceeds,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetSale,
            )
            .context("Failed to convert proceeds category")?,
        );

        base.add_entries(vec![sale_entry, proceeds_entry]);

        let ret = Box::new(AssetSaleTransaction { base });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(AssetSaleTransaction {
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let sale_entry = self.base.entry(|x| x.quantity < dec!(0))?;
        let proceeds_entry = self.base.entry(|x| x.quantity >= dec!(0))?;

        tracing::trace!(
            "Processing asset sale transaction with sale entry: {:?} and proceeds entry: {:?}",
            sale_entry,
            proceeds_entry
        );
        let fee_total = self.base.fee_entries_total();
        let cash_units = proceeds_entry.quantity + fee_total;
        Ok(TransactionPortfolioAction::Referential(Box::new(
            AssetSale {
                instrument_asset_id: sale_entry.asset_id,
                account_id: sale_entry.account_id,
                instrument_units: sale_entry.quantity.abs(),
                instrument_reference_price: proceeds_entry.quantity / sale_entry.quantity.abs(),
                fees: fee_total.abs(),
                cash_asset_id: proceeds_entry.asset_id,
                cash_units,
                date: self.base.date(),
            },
        )))
    }
}
