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
    dtos::transaction_dto::{AssetBalanceTransferMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::asset_balance_transfer::AssetBalanceTransfer,
        transactions::{
            base_transaction::BaseTransaction,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct AssetBalanceTransferTransaction {
    base: BaseTransaction,
}

impl TransactionProcessor for AssetBalanceTransferTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let outgoing_change = self.base.entry(|x| x.quantity < dec!(0))?;
        let incoming_change = self.base.entry(|x| x.quantity > dec!(0))?;

        let metadata = TransactionTypeDto::AssetBalanceTransfer(AssetBalanceTransferMetadataDto {
            outgoing_change: outgoing_change.clone().into(),
            incoming_change: incoming_change.clone().into(),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::AssetBalanceTransfer)
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
            TransactionTypeDto::AssetBalanceTransfer(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        let mut base = BaseTransaction::new(user_id, dto.transaction_id, dto.date, vec![]);
        base.add_fee_entries_from_dtos(dto.fee_entries)?;

        let outgoing_entry = Entry::from_dto(
            metadata.outgoing_change,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetBalanceTransfer,
            )
            .context("Failed to convert asset balance transfer category")?,
        );

        let incoming_entry = Entry::from_dto(
            metadata.incoming_change,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetBalanceTransfer,
            )
            .context("Failed to convert asset balance transfer category")?,
        );

        base.add_entries(vec![outgoing_entry, incoming_entry]);

        let ret = Box::new(AssetBalanceTransferTransaction { base });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(AssetBalanceTransferTransaction {
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let outgoing_entry = self.base.entry(|x| x.quantity < dec!(0))?;
        let incoming_entry = self.base.entry(|x| x.quantity > dec!(0))?;

        Ok(TransactionPortfolioAction::Regular(Box::new(
            AssetBalanceTransfer {
                asset_id: outgoing_entry.asset_id,
                account_from: outgoing_entry.account_id,
                account_to: incoming_entry.account_id,
                quantity: incoming_entry.quantity,
                fees: self.base.fee_entries_total().abs(),
                date: self.base.date(),
            },
        )))
    }
}
