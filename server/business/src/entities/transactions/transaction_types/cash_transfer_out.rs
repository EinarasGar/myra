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
                fees: -self.base.fee_entries_total(),
                date: self.base.date(),
            },
        )))
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal::Decimal;
    use time::macros::datetime;

    use super::*;
    use crate::{
        dtos::{entry_dto::EntryDto, fee_entry_dto::FeeEntryDto},
        dynamic_enums::fee_categories::FeeCategories,
        entities::{
            categories::fee_categories::FeeCategoeis, portfolio_overview::portfolio::Portfolio,
        },
    };

    fn transfer_out_dto(
        account_id: Uuid,
        quantity: Decimal,
        fee_quantities: Vec<Decimal>,
    ) -> TransactionDto {
        TransactionDto {
            transaction_id: None,
            date: datetime!(2000-03-22 00:00:00 UTC),
            fee_entries: fee_quantities
                .into_iter()
                .map(|q| FeeEntryDto {
                    entry: EntryDto::new(10, account_id, q),
                    entry_type: FeeCategoeis::Transaction,
                })
                .collect(),
            transaction_type: TransactionTypeDto::CashTransferOut(CashTransferOutMetadataDto {
                entry: EntryDto::new(10, account_id, quantity),
            }),
        }
    }

    #[test]
    fn try_from_dto_stamps_reserved_cash_transfer_out_category() {
        crate::test_support::load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let dto = transfer_out_dto(account_id, dec!(-100), vec![dec!(-2)]);

        let transaction = CashTransferOutTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("try_from_dto failed");

        let entries = transaction.get_entries();
        assert_eq!(entries.len(), 2);

        let main = entries
            .iter()
            .find(|e| !e.is_fee())
            .expect("main entry missing");
        assert_eq!(
            main.category,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::CashTransferOut,
            )
            .expect("cash transfer out category id")
        );
        assert_eq!(main.asset_id, 10);
        assert_eq!(main.account_id, account_id);
        assert_eq!(main.quantity, dec!(-100));

        let fee = entries
            .iter()
            .find(|e| e.is_fee())
            .expect("fee entry missing");
        assert_eq!(fee.quantity, dec!(-2));
        assert_eq!(
            fee.category,
            FeeCategories::try_into_dynamic_enum(FeeCategoeis::Transaction)
                .expect("transaction fee category id")
        );
    }

    #[test]
    fn try_into_dto_round_trips_negative_leg_excluding_fee_entries() {
        crate::test_support::load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let dto = transfer_out_dto(account_id, dec!(-100), vec![dec!(-2)]);

        let transaction = CashTransferOutTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("try_from_dto failed");
        let round_trip = transaction.try_into_dto().expect("try_into_dto failed");

        assert_eq!(round_trip.transaction_id, None);
        assert_eq!(round_trip.date, datetime!(2000-03-22 00:00:00 UTC));

        match round_trip.transaction_type {
            TransactionTypeDto::CashTransferOut(metadata) => {
                assert_eq!(metadata.entry.asset_id, 10);
                assert_eq!(metadata.entry.account_id, account_id);
                assert_eq!(metadata.entry.quantity, dec!(-100));
            }
            _ => panic!("Expected cash transfer out metadata"),
        }

        assert_eq!(round_trip.fee_entries.len(), 1);
        assert_eq!(round_trip.fee_entries[0].entry.quantity, dec!(-2));
        assert_eq!(
            round_trip.fee_entries[0].entry_type,
            FeeCategoeis::Transaction
        );
    }

    #[test]
    fn get_portfolio_action_lowers_cash_by_amount_plus_fee() {
        crate::test_support::load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let dto = transfer_out_dto(account_id, dec!(-100), vec![dec!(-2)]);

        let transaction = CashTransferOutTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("try_from_dto failed");
        let action = transaction
            .get_portfolio_action()
            .expect("get_portfolio_action failed");

        let TransactionPortfolioAction::Regular(action) = action else {
            panic!("Expected regular portfolio action");
        };
        assert_eq!(action.date(), datetime!(2000-03-22 00:00:00 UTC));

        let mut portfolio = Portfolio::new();
        action.update_porfolio(&mut portfolio);

        let cash = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio missing")
            .cash_portfolios
            .get(&10)
            .expect("cash portfolio missing");
        assert_eq!(cash.units(), dec!(-102));
        assert_eq!(cash.fees(), dec!(2));
    }
}
