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
    dtos::transaction_dto::{AccountFeesMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::account_fees::AccountFees,
        transactions::{
            base_transaction::BaseTransaction,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct AccountFeesTransaction {
    base: BaseTransaction,
}

impl TransactionProcessor for AccountFeesTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let entry = self.base.entry(|x| x.quantity <= dec!(0))?;

        let metadata = TransactionTypeDto::AccountFees(AccountFeesMetadataDto {
            entry: entry.clone().into(),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::AccountFees)
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
            TransactionTypeDto::AccountFees(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        let mut base = BaseTransaction::new(user_id, dto.transaction_id, dto.date, vec![]);
        base.add_fee_entries_from_dtos(dto.fee_entries)?;

        let entry = Entry::from_dto(
            metadata.entry,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AccountFees,
            )
            .context("Failed to convert account fees category")?,
        );

        base.add_entries(vec![entry]);

        let ret = Box::new(AccountFeesTransaction { base });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(AccountFeesTransaction {
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let entry = self.base.entry(|x| x.quantity <= dec!(0))?;

        Ok(TransactionPortfolioAction::Regular(Box::new(AccountFees {
            asset_id: entry.asset_id,
            account_id: entry.account_id,
            quantity: entry.quantity.abs(),
            date: self.base.date(),
        })))
    }
}

#[cfg(test)]
mod tests {
    use dal::enums::fee_categories::DatabaseFeeCategories;
    use rust_decimal::Decimal;
    use rust_decimal_macros::dec;
    use time::macros::datetime;

    use crate::{
        dtos::{entry_dto::EntryDto, fee_entry_dto::FeeEntryDto},
        entities::portfolio_overview::portfolio::Portfolio,
        test_support::load_dynamic_enums,
    };

    use super::*;

    fn fee(account_id: Uuid, quantity: Decimal, entry_type: DatabaseFeeCategories) -> FeeEntryDto {
        FeeEntryDto {
            entry: EntryDto::new(20, account_id, quantity),
            entry_type,
        }
    }

    fn account_fees_dto(account_id: Uuid, fee_entries: Vec<FeeEntryDto>) -> TransactionDto {
        TransactionDto {
            transaction_id: None,
            date: datetime!(2000-03-22 00:00:00 UTC),
            fee_entries,
            transaction_type: TransactionTypeDto::AccountFees(AccountFeesMetadataDto {
                entry: EntryDto::new(20, account_id, dec!(-7)),
            }),
        }
    }

    #[test]
    fn try_from_dto_stamps_account_fees_category_and_fee_category() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AccountFeesTransaction::try_from_dto(
            account_fees_dto(
                account_id,
                vec![fee(
                    account_id,
                    dec!(-2),
                    DatabaseFeeCategories::Transaction,
                )],
            ),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        let entries = transaction.get_entries();
        assert_eq!(entries.len(), 2);

        let main_entry = entries
            .iter()
            .find(|x| x.quantity == dec!(-7))
            .expect("main entry");
        assert_eq!(main_entry.category, 14);
        assert_eq!(main_entry.asset_id, 20);
        assert_eq!(main_entry.account_id, account_id);
        assert!(!main_entry.is_fee());

        let fee_entry = entries
            .iter()
            .find(|x| x.quantity == dec!(-2))
            .expect("fee entry");
        assert_eq!(fee_entry.category, 2);
        assert!(fee_entry.is_fee());
    }

    #[test]
    fn try_into_dto_round_trips_entry_fees_and_transaction_id() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let transaction_id = Uuid::new_v4();

        let mut transaction = AccountFeesTransaction::try_from_dto(
            account_fees_dto(
                account_id,
                vec![fee(
                    account_id,
                    dec!(-2),
                    DatabaseFeeCategories::Transaction,
                )],
            ),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        assert_eq!(transaction.get_transaction_id(), None);
        transaction.set_transaction_id(transaction_id);
        assert_eq!(transaction.get_transaction_id(), Some(transaction_id));

        let dto = transaction.try_into_dto().expect("should convert to dto");

        assert_eq!(dto.transaction_id, Some(transaction_id));
        assert_eq!(dto.date, datetime!(2000-03-22 00:00:00 UTC));
        assert_eq!(dto.fee_entries.len(), 1);
        assert_eq!(
            dto.fee_entries[0].entry_type,
            DatabaseFeeCategories::Transaction
        );
        assert_eq!(dto.fee_entries[0].entry.quantity, dec!(-2));

        match dto.transaction_type {
            TransactionTypeDto::AccountFees(metadata) => {
                assert_eq!(metadata.entry.quantity, dec!(-7));
                assert_eq!(metadata.entry.asset_id, 20);
                assert_eq!(metadata.entry.account_id, account_id);
            }
            _ => panic!("expected account fees metadata"),
        }
    }

    #[test]
    fn portfolio_action_reduces_cash_and_raises_fee_total() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AccountFeesTransaction::try_from_dto(
            account_fees_dto(account_id, vec![]),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        let TransactionPortfolioAction::Regular(action) = transaction
            .get_portfolio_action()
            .expect("should produce portfolio action")
        else {
            panic!("expected regular portfolio action");
        };

        assert_eq!(action.date(), datetime!(2000-03-22 00:00:00 UTC));

        let mut portfolio = Portfolio::new();
        action.update_porfolio(&mut portfolio);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio")
            .cash_portfolios
            .get(&20)
            .expect("cash portfolio");

        assert_eq!(cash_portfolio.units(), dec!(-7));
        assert_eq!(cash_portfolio.fees(), dec!(7));
        assert_eq!(cash_portfolio.dividends(), dec!(0));
    }
}
