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
    dtos::transaction_dto::{AssetTransferOutMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::asset_transfer_out::AssetTransferOut,
        transactions::{
            base_transaction::BaseTransaction,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct AssetTransferOutTransaction {
    base: BaseTransaction,
}

impl TransactionProcessor for AssetTransferOutTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let entry = self.base.entry(|x| x.quantity <= dec!(0))?;

        let metadata = TransactionTypeDto::AssetTransferOut(AssetTransferOutMetadataDto {
            entry: entry.clone().into(),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::AssetTransferOut)
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
            TransactionTypeDto::AssetTransferOut(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        let mut base = BaseTransaction::new(user_id, dto.transaction_id, dto.date, vec![]);
        base.add_fee_entries_from_dtos(dto.fee_entries)?;

        let entry = Entry::from_dto(
            metadata.entry,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetTransferOut,
            )
            .context("Failed to convert asset transfer out category")?,
        );

        base.add_entries(vec![entry]);

        let ret = Box::new(AssetTransferOutTransaction { base });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(AssetTransferOutTransaction {
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let entry = self.base.entry(|x| x.quantity <= dec!(0))?;

        Ok(TransactionPortfolioAction::Referential(Box::new(
            AssetTransferOut {
                asset_id: entry.asset_id,
                account_id: entry.account_id,
                quantity: entry.quantity.abs(),
                fees: self.base.fee_entries_total().abs(),
                date: self.base.date(),
            },
        )))
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
        entities::portfolio_overview::portfolio::{
            portfolio_asset_position_dto::PortfolioAssetPosition, Portfolio,
        },
        test_support::load_dynamic_enums,
    };

    use super::*;

    fn fee(account_id: Uuid, quantity: Decimal, entry_type: DatabaseFeeCategories) -> FeeEntryDto {
        FeeEntryDto {
            entry: EntryDto::new(20, account_id, quantity),
            entry_type,
        }
    }

    fn transfer_out_dto(
        account_id: Uuid,
        quantity: Decimal,
        fee_entries: Vec<FeeEntryDto>,
    ) -> TransactionDto {
        TransactionDto {
            transaction_id: None,
            date: datetime!(2000-03-24 00:00:00 UTC),
            fee_entries,
            transaction_type: TransactionTypeDto::AssetTransferOut(AssetTransferOutMetadataDto {
                entry: EntryDto::new(1, account_id, quantity),
            }),
        }
    }

    #[test]
    fn try_from_dto_stamps_transfer_out_category_and_fee_category() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AssetTransferOutTransaction::try_from_dto(
            transfer_out_dto(
                account_id,
                dec!(-2),
                vec![fee(account_id, dec!(-1), DatabaseFeeCategories::Exchange)],
            ),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        let entries = transaction.get_entries();
        assert_eq!(entries.len(), 2);

        let main_entry = entries
            .iter()
            .find(|x| x.quantity == dec!(-2))
            .expect("main entry");
        assert_eq!(main_entry.category, 10);
        assert_eq!(main_entry.asset_id, 1);
        assert_eq!(main_entry.account_id, account_id);

        let fee_entry = entries
            .iter()
            .find(|x| x.quantity == dec!(-1))
            .expect("fee entry");
        assert_eq!(fee_entry.category, 1);
        assert!(fee_entry.is_fee());
    }

    #[test]
    fn try_into_dto_round_trips_negative_entry_and_fee_entries() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AssetTransferOutTransaction::try_from_dto(
            transfer_out_dto(
                account_id,
                dec!(-2),
                vec![fee(account_id, dec!(-1), DatabaseFeeCategories::Exchange)],
            ),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        let dto = transaction.try_into_dto().expect("should convert to dto");

        assert_eq!(dto.transaction_id, None);
        assert_eq!(dto.date, datetime!(2000-03-24 00:00:00 UTC));
        assert_eq!(dto.fee_entries.len(), 1);
        assert_eq!(
            dto.fee_entries[0].entry_type,
            DatabaseFeeCategories::Exchange
        );
        assert_eq!(dto.fee_entries[0].entry.quantity, dec!(-1));

        match dto.transaction_type {
            TransactionTypeDto::AssetTransferOut(metadata) => {
                assert_eq!(metadata.entry.asset_id, 1);
                assert_eq!(metadata.entry.quantity, dec!(-2));
                assert_eq!(metadata.entry.account_id, account_id);
            }
            _ => panic!("expected asset transfer out metadata"),
        }
    }

    #[test]
    fn portfolio_action_removes_units_oldest_first() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let mut portfolio = Portfolio::new();
        portfolio
            .get_asset_portfolio(account_id, 1)
            .add_positions(vec![
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(2),
                    datetime!(2000-03-22 00:00:00 UTC),
                    dec!(0),
                ),
                PortfolioAssetPosition::new(
                    dec!(20),
                    dec!(3),
                    datetime!(2000-03-23 00:00:00 UTC),
                    dec!(0),
                ),
            ]);

        let transaction = AssetTransferOutTransaction::try_from_dto(
            transfer_out_dto(account_id, dec!(-2), vec![]),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        let TransactionPortfolioAction::Referential(action) = transaction
            .get_portfolio_action()
            .expect("should produce portfolio action")
        else {
            panic!("expected referential portfolio action");
        };

        assert_eq!(action.get_conversion_asset_id().0, 1);
        assert_eq!(action.date(), datetime!(2000-03-24 00:00:00 UTC));

        action.update_porfolio(&mut portfolio);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio")
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio");

        assert_eq!(asset_portfolio.positions.len(), 1);
        let remaining = &asset_portfolio.positions[0];
        assert_eq!(remaining.add_price(), dec!(20));
        assert_eq!(remaining.units(), dec!(3));
        assert_eq!(remaining.add_date(), datetime!(2000-03-23 00:00:00 UTC));
    }

    #[test]
    fn portfolio_action_partial_removal_takes_proportional_fees_along() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let mut portfolio = Portfolio::new();
        portfolio
            .get_asset_portfolio(account_id, 1)
            .add_positions(vec![PortfolioAssetPosition::new(
                dec!(10),
                dec!(4),
                datetime!(2000-03-22 00:00:00 UTC),
                dec!(2),
            )]);

        let transaction = AssetTransferOutTransaction::try_from_dto(
            transfer_out_dto(account_id, dec!(-1), vec![]),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        let TransactionPortfolioAction::Referential(action) = transaction
            .get_portfolio_action()
            .expect("should produce portfolio action")
        else {
            panic!("expected referential portfolio action");
        };

        action.update_porfolio(&mut portfolio);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio")
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio");

        assert_eq!(asset_portfolio.positions.len(), 1);
        let remaining = &asset_portfolio.positions[0];
        assert_eq!(remaining.units(), dec!(3));
        assert_eq!(remaining.total_fees(), dec!(1.5));
        assert_eq!(remaining.add_price(), dec!(10));
    }

    #[test]
    fn portfolio_action_transfer_out_beyond_held_units_consumes_everything_silently() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let mut portfolio = Portfolio::new();
        portfolio
            .get_asset_portfolio(account_id, 1)
            .add_positions(vec![PortfolioAssetPosition::new(
                dec!(10),
                dec!(2),
                datetime!(2000-03-22 00:00:00 UTC),
                dec!(0),
            )]);

        let transaction = AssetTransferOutTransaction::try_from_dto(
            transfer_out_dto(account_id, dec!(-5), vec![]),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        let TransactionPortfolioAction::Referential(action) = transaction
            .get_portfolio_action()
            .expect("should produce portfolio action")
        else {
            panic!("expected referential portfolio action");
        };

        action.update_porfolio(&mut portfolio);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio")
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio");

        assert!(asset_portfolio.positions.is_empty());
    }
}
