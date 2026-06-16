use anyhow::{ensure, Context, Result};
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
    dtos::transaction_dto::{CashBalanceTransferMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::cash_balance_transfer::CashBalanceTransfer,
        transactions::{
            base_transaction::BaseTransaction,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct CashBalanceTransferTransaction {
    base: BaseTransaction,
}

impl TransactionProcessor for CashBalanceTransferTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let outgoing_change = self.base.entry(|x| x.quantity < dec!(0))?;
        let incoming_change = self.base.entry(|x| x.quantity > dec!(0))?;

        let metadata = TransactionTypeDto::CashBalanceTransfer(CashBalanceTransferMetadataDto {
            outgoing_change: outgoing_change.clone().into(),
            incoming_change: incoming_change.clone().into(),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::CashBalanceTransfer)
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
            TransactionTypeDto::CashBalanceTransfer(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        ensure!(
            metadata.outgoing_change.asset_id == metadata.incoming_change.asset_id,
            "Cash balance transfer entries must use the same asset"
        );
        ensure!(
            metadata.outgoing_change.quantity == -metadata.incoming_change.quantity,
            "Cash balance transfer entries must have equal magnitude and opposite signs"
        );
        ensure!(
            metadata.outgoing_change.account_id != metadata.incoming_change.account_id,
            "Cash balance transfer entries must use distinct accounts"
        );

        let mut base = BaseTransaction::new(user_id, dto.transaction_id, dto.date, vec![]);
        base.add_fee_entries_from_dtos(dto.fee_entries)?;

        let outgoing_entry = Entry::from_dto(
            metadata.outgoing_change,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::CashBalanceTransfer,
            )
            .context("Failed to convert cash balance transfer category")?,
        );

        let incoming_entry = Entry::from_dto(
            metadata.incoming_change,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::CashBalanceTransfer,
            )
            .context("Failed to convert cash balance transfer category")?,
        );

        base.add_entries(vec![outgoing_entry, incoming_entry]);

        let ret = Box::new(CashBalanceTransferTransaction { base });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(CashBalanceTransferTransaction {
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let outgoing_entry = self.base.entry(|x| x.quantity < dec!(0))?;
        let incoming_entry = self.base.entry(|x| x.quantity > dec!(0))?;

        Ok(TransactionPortfolioAction::Regular(Box::new(
            CashBalanceTransfer {
                asset_id: outgoing_entry.asset_id,
                account_from: outgoing_entry.account_id,
                account_to: incoming_entry.account_id,
                units: incoming_entry.quantity,
                fees: -self.base.fee_entries_total(),
                date: self.base.date(),
            },
        )))
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal_macros::dec;
    use time::macros::datetime;

    use crate::{
        dtos::{
            entry_dto::EntryDto, fee_entry_dto::FeeEntryDto, fee_entry_types_dto::FeeEntryTypesDto,
        },
        entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction},
        test_support::{load_dynamic_enums, CASH_BALANCE_TRANSFER_CATEGORY},
    };

    use super::*;

    fn transfer_dto(
        outgoing: EntryDto,
        incoming: EntryDto,
        fee_entries: Vec<FeeEntryDto>,
    ) -> TransactionDto {
        TransactionDto {
            transaction_id: None,
            date: datetime!(2000-03-23 00:00:00 UTC),
            fee_entries,
            transaction_type: TransactionTypeDto::CashBalanceTransfer(
                CashBalanceTransferMetadataDto {
                    outgoing_change: outgoing,
                    incoming_change: incoming,
                },
            ),
        }
    }

    fn unwrap_regular_action(transaction: &Transaction) -> Box<dyn PortfolioAction> {
        match transaction
            .get_portfolio_action()
            .expect("should produce a portfolio action")
        {
            TransactionPortfolioAction::Regular(action) => action,
            _ => panic!("Expected a regular portfolio action"),
        }
    }

    #[test]
    fn try_from_dto_rejects_mismatched_assets() {
        load_dynamic_enums();
        let dto = transfer_dto(
            EntryDto::new(1, Uuid::new_v4(), dec!(-100)),
            EntryDto::new(2, Uuid::new_v4(), dec!(100)),
            vec![],
        );

        let error = CashBalanceTransferTransaction::try_from_dto(dto, Uuid::new_v4())
            .err()
            .expect("mismatched assets should be rejected");

        assert_eq!(
            error.to_string(),
            "Cash balance transfer entries must use the same asset"
        );
    }

    #[test]
    fn try_from_dto_rejects_unequal_magnitudes() {
        load_dynamic_enums();
        let dto = transfer_dto(
            EntryDto::new(1, Uuid::new_v4(), dec!(-100)),
            EntryDto::new(1, Uuid::new_v4(), dec!(90)),
            vec![],
        );

        let error = CashBalanceTransferTransaction::try_from_dto(dto, Uuid::new_v4())
            .err()
            .expect("unequal magnitudes should be rejected");

        assert_eq!(
            error.to_string(),
            "Cash balance transfer entries must have equal magnitude and opposite signs"
        );
    }

    #[test]
    fn try_from_dto_rejects_same_sign_legs() {
        load_dynamic_enums();
        let dto = transfer_dto(
            EntryDto::new(1, Uuid::new_v4(), dec!(100)),
            EntryDto::new(1, Uuid::new_v4(), dec!(100)),
            vec![],
        );

        let error = CashBalanceTransferTransaction::try_from_dto(dto, Uuid::new_v4())
            .err()
            .expect("same-sign legs should be rejected");

        assert_eq!(
            error.to_string(),
            "Cash balance transfer entries must have equal magnitude and opposite signs"
        );
    }

    #[test]
    fn try_from_dto_rejects_identical_accounts() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let dto = transfer_dto(
            EntryDto::new(1, account_id, dec!(-100)),
            EntryDto::new(1, account_id, dec!(100)),
            vec![],
        );

        let error = CashBalanceTransferTransaction::try_from_dto(dto, Uuid::new_v4())
            .err()
            .expect("identical accounts should be rejected");

        assert_eq!(
            error.to_string(),
            "Cash balance transfer entries must use distinct accounts"
        );
    }

    #[test]
    fn try_from_dto_stamps_both_entries_with_cash_balance_transfer_category() {
        load_dynamic_enums();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();
        let dto = transfer_dto(
            EntryDto::new(1, account_from, dec!(-100)),
            EntryDto::new(1, account_to, dec!(100)),
            vec![],
        );

        let transaction = CashBalanceTransferTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("valid cash balance transfer dto");

        let entries = transaction.get_entries();
        assert_eq!(entries.len(), 2);
        assert!(entries
            .iter()
            .all(|x| x.category == CASH_BALANCE_TRANSFER_CATEGORY));
        assert_eq!(entries[0].quantity, dec!(-100));
        assert_eq!(entries[0].account_id, account_from);
        assert_eq!(entries[1].quantity, dec!(100));
        assert_eq!(entries[1].account_id, account_to);
    }

    #[test]
    fn portfolio_action_moves_cash_with_fee_charged_to_source_account() {
        load_dynamic_enums();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();
        let dto = transfer_dto(
            EntryDto::new(1, account_from, dec!(-100)),
            EntryDto::new(1, account_to, dec!(100)),
            vec![FeeEntryDto {
                entry: EntryDto::new(1, account_from, dec!(-1.5)),
                entry_type: FeeEntryTypesDto::Transaction,
            }],
        );
        let transaction = CashBalanceTransferTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("valid cash balance transfer dto");
        let action = unwrap_regular_action(&transaction);
        assert_eq!(action.date(), datetime!(2000-03-23 00:00:00 UTC));

        let mut portfolio = Portfolio::new();
        action.update_porfolio(&mut portfolio);

        let source_cash = portfolio
            .account_portfolios()
            .get(&account_from)
            .expect("source account should exist")
            .cash_portfolios
            .get(&1)
            .expect("source cash portfolio should exist");
        let destination_cash = portfolio
            .account_portfolios()
            .get(&account_to)
            .expect("destination account should exist")
            .cash_portfolios
            .get(&1)
            .expect("destination cash portfolio should exist");

        assert_eq!(source_cash.units(), dec!(-101.5));
        assert_eq!(source_cash.fees(), dec!(1.5));
        assert_eq!(destination_cash.units(), dec!(100));
        assert_eq!(destination_cash.fees(), dec!(0));
        let source_account = portfolio
            .account_portfolios()
            .get(&account_from)
            .expect("source account should exist");
        assert!(source_account.asset_portfolios.is_empty());
    }

    #[test]
    fn portfolio_action_without_fees_moves_amount_only() {
        load_dynamic_enums();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();
        let dto = transfer_dto(
            EntryDto::new(1, account_from, dec!(-40)),
            EntryDto::new(1, account_to, dec!(40)),
            vec![],
        );
        let transaction = CashBalanceTransferTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("valid cash balance transfer dto");
        let action = unwrap_regular_action(&transaction);

        let mut portfolio = Portfolio::new();
        action.update_porfolio(&mut portfolio);

        let source_cash = portfolio
            .account_portfolios()
            .get(&account_from)
            .expect("source account should exist")
            .cash_portfolios
            .get(&1)
            .expect("source cash portfolio should exist");
        let destination_cash = portfolio
            .account_portfolios()
            .get(&account_to)
            .expect("destination account should exist")
            .cash_portfolios
            .get(&1)
            .expect("destination cash portfolio should exist");

        assert_eq!(source_cash.units(), dec!(-40));
        assert_eq!(source_cash.fees(), dec!(0));
        assert_eq!(destination_cash.units(), dec!(40));
    }

    #[test]
    fn try_into_dto_round_trips() {
        load_dynamic_enums();
        let transaction_id = Uuid::new_v4();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();
        let dto = TransactionDto {
            transaction_id: Some(transaction_id),
            date: datetime!(2000-03-23 00:00:00 UTC),
            fee_entries: vec![FeeEntryDto {
                entry: EntryDto::new(1, account_from, dec!(-1.5)),
                entry_type: FeeEntryTypesDto::Transaction,
            }],
            transaction_type: TransactionTypeDto::CashBalanceTransfer(
                CashBalanceTransferMetadataDto {
                    outgoing_change: EntryDto::new(1, account_from, dec!(-100)),
                    incoming_change: EntryDto::new(1, account_to, dec!(100)),
                },
            ),
        };

        let transaction = CashBalanceTransferTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("valid cash balance transfer dto");
        let round_tripped = transaction.try_into_dto().expect("should build dto");

        assert_eq!(round_tripped.transaction_id, Some(transaction_id));
        assert_eq!(round_tripped.date, datetime!(2000-03-23 00:00:00 UTC));
        let metadata = match round_tripped.transaction_type {
            TransactionTypeDto::CashBalanceTransfer(metadata) => metadata,
            _ => panic!("Expected cash balance transfer metadata"),
        };
        assert_eq!(metadata.outgoing_change.asset_id, 1);
        assert_eq!(metadata.outgoing_change.account_id, account_from);
        assert_eq!(metadata.outgoing_change.quantity, dec!(-100));
        assert_eq!(metadata.incoming_change.asset_id, 1);
        assert_eq!(metadata.incoming_change.account_id, account_to);
        assert_eq!(metadata.incoming_change.quantity, dec!(100));
        assert_eq!(round_tripped.fee_entries.len(), 1);
        assert_eq!(
            round_tripped.fee_entries[0].entry_type,
            FeeEntryTypesDto::Transaction
        );
        assert_eq!(round_tripped.fee_entries[0].entry.quantity, dec!(-1.5));
        assert_eq!(round_tripped.fee_entries[0].entry.account_id, account_from);
    }
}
