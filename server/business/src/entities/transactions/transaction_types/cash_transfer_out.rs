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
    dtos::transaction_dto::{CashTransferOutMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::cash_transfer_out::CashTransferOut,
        transactions::{
            base_transaction::BaseTransaction,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct CashTransferOutTransaction {
    base: BaseTransaction,
}

impl TransactionProcessor for CashTransferOutTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let entry = self.base.entry(|x| x.quantity <= dec!(0))?;

        let metadata = TransactionTypeDto::CashTransferOut(CashTransferOutMetadataDto {
            entry: entry.clone().into(),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::CashTransferOut)
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
            TransactionTypeDto::CashTransferOut(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        let mut base = BaseTransaction::new(user_id, dto.transaction_id, dto.date, vec![]);
        base.add_fee_entries_from_dtos(dto.fee_entries)?;

        let entry = Entry::from_dto(
            metadata.entry,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::CashTransferOut,
            )
            .context("Failed to convert cash transfer out category")?,
        );

        base.add_entries(vec![entry]);

        let ret = Box::new(CashTransferOutTransaction { base });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(CashTransferOutTransaction {
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let entry = self.base.entry(|x| x.quantity <= dec!(0))?;

        Ok(TransactionPortfolioAction::Regular(Box::new(
            CashTransferOut {
                asset_id: entry.asset_id,
                account_id: entry.account_id,
                units: entry.quantity.abs(),
                fees: dec!(0),
                date: self.base.date(),
            },
        )))
    }
}
