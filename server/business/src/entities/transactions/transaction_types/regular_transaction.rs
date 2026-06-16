use dal::{
    enums::transaction_types::DatabaseTransactionTypes,
    models::transaction_models::{AddTransactionModel, TransactionWithEntriesModel},
};
use uuid::Uuid;

use crate::{
    dtos::transaction_dto::{RegularTransactionMetadataDto, TransactionDto, TransactionTypeDto},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::regular_cash_change::RegularCashChange,
        transactions::{
            base_transaction::BaseTransaction,
            metadata::MetadataField,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};
use anyhow::Result;

use super::TransactionProcessor;

pub struct RegularTransaction {
    base: BaseTransaction,
    description: Option<String>,
}

impl TransactionProcessor for RegularTransaction {
    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::RegularTransaction)
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

    fn try_into_dto(&self) -> Result<TransactionDto> {
        //do i need to check if there are other entreies? idk
        let main_entry = self.base.entry(|_| true)?;

        let metadata = TransactionTypeDto::Regular(RegularTransactionMetadataDto {
            description: self.description.clone(),
            entry: main_entry.clone().into(),
            category_id: main_entry.category,
        });

        self.base.try_into_dto(metadata)
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

    fn try_from_dto(dto: TransactionDto, user_id: Uuid) -> Result<Transaction> {
        let metadata = match dto.transaction_type {
            TransactionTypeDto::Regular(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        let mut base = BaseTransaction::new(user_id, dto.transaction_id, dto.date, vec![]);
        base.add_fee_entries_from_dtos(dto.fee_entries)?;

        let entry = Entry::from_dto(metadata.entry, metadata.category_id);

        base.add_entries(vec![entry]);

        let ret = Box::new(RegularTransaction {
            description: metadata.description,
            base,
        });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(RegularTransaction {
            description: None,
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let entry = self.base.entry(|_| true)?;

        Ok(TransactionPortfolioAction::Regular(Box::new(
            RegularCashChange {
                asset_id: entry.asset_id,
                account_id: entry.account_id,
                units: entry.quantity,
                fees: -self.base.fee_entries_total(),
                date: self.base.date(),
            },
        )))
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal::Decimal;
    use rust_decimal_macros::dec;
    use time::macros::datetime;
    use uuid::Uuid;

    use super::*;
    use crate::{
        dtos::{entry_dto::EntryDto, fee_entry_dto::FeeEntryDto},
        dynamic_enums::{fee_categories::FeeCategories, DynamicEnum},
        entities::{
            categories::fee_categories::FeeCategoeis, portfolio_overview::portfolio::Portfolio,
        },
    };

    const USER_CATEGORY: i32 = 42;

    fn regular_dto(
        account_id: Uuid,
        quantity: Decimal,
        fee_quantities: Vec<Decimal>,
        description: Option<String>,
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
            transaction_type: TransactionTypeDto::Regular(RegularTransactionMetadataDto {
                description,
                entry: EntryDto::new(10, account_id, quantity),
                category_id: USER_CATEGORY,
            }),
        }
    }

    #[test]
    fn try_from_dto_keeps_user_category_and_adds_fee_entry() {
        crate::test_support::load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let dto = regular_dto(account_id, dec!(-100), vec![dec!(-5)], None);

        let transaction =
            RegularTransaction::try_from_dto(dto, Uuid::new_v4()).expect("try_from_dto failed");

        let entries = transaction.get_entries();
        assert_eq!(entries.len(), 2);

        let main = entries
            .iter()
            .find(|e| !e.is_fee())
            .expect("main entry missing");
        assert_eq!(main.category, USER_CATEGORY);
        assert_eq!(main.asset_id, 10);
        assert_eq!(main.account_id, account_id);
        assert_eq!(main.quantity, dec!(-100));

        let fee = entries
            .iter()
            .find(|e| e.is_fee())
            .expect("fee entry missing");
        assert_eq!(fee.quantity, dec!(-5));
        assert_eq!(
            fee.category,
            FeeCategories::try_into_dynamic_enum(FeeCategoeis::Transaction)
                .expect("transaction fee category id")
        );
    }

    #[test]
    fn try_into_dto_round_trips_main_entry_description_and_fees() {
        crate::test_support::load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let dto = regular_dto(
            account_id,
            dec!(-100),
            vec![dec!(-5)],
            Some("Lunch at Gino's".to_string()),
        );

        let transaction =
            RegularTransaction::try_from_dto(dto, Uuid::new_v4()).expect("try_from_dto failed");
        let round_trip = transaction.try_into_dto().expect("try_into_dto failed");

        assert_eq!(round_trip.transaction_id, None);
        assert_eq!(round_trip.date, datetime!(2000-03-22 00:00:00 UTC));

        match round_trip.transaction_type {
            TransactionTypeDto::Regular(metadata) => {
                assert_eq!(metadata.description.as_deref(), Some("Lunch at Gino's"));
                assert_eq!(metadata.category_id, USER_CATEGORY);
                assert_eq!(metadata.entry.asset_id, 10);
                assert_eq!(metadata.entry.account_id, account_id);
                assert_eq!(metadata.entry.quantity, dec!(-100));
            }
            _ => panic!("Expected regular metadata"),
        }

        assert_eq!(round_trip.fee_entries.len(), 1);
        assert_eq!(round_trip.fee_entries[0].entry.quantity, dec!(-5));
        assert_eq!(
            round_trip.fee_entries[0].entry_type,
            FeeCategoeis::Transaction
        );
    }

    #[test]
    fn get_portfolio_action_income_with_fee_raises_cash_net_of_fees() {
        crate::test_support::load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let dto = regular_dto(account_id, dec!(50), vec![dec!(-2)], None);

        let transaction =
            RegularTransaction::try_from_dto(dto, Uuid::new_v4()).expect("try_from_dto failed");
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
        assert_eq!(cash.units(), dec!(48));
        assert_eq!(cash.fees(), dec!(2));
    }

    #[test]
    fn get_portfolio_action_spending_with_fee_drops_cash_by_amount_plus_fee() {
        crate::test_support::load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let dto = regular_dto(account_id, dec!(-100), vec![dec!(-5)], None);

        let transaction =
            RegularTransaction::try_from_dto(dto, Uuid::new_v4()).expect("try_from_dto failed");
        let action = transaction
            .get_portfolio_action()
            .expect("get_portfolio_action failed");

        let TransactionPortfolioAction::Regular(action) = action else {
            panic!("Expected regular portfolio action");
        };

        let mut portfolio = Portfolio::new();
        action.update_porfolio(&mut portfolio);

        let cash = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio missing")
            .cash_portfolios
            .get(&10)
            .expect("cash portfolio missing");
        assert_eq!(cash.units(), dec!(-105));
        assert_eq!(cash.fees(), dec!(5));
    }
}
