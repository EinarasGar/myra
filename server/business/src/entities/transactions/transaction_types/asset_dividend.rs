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
    dtos::transaction_dto::{AssetDividendMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::asset_dividend::{AssetDividend, CashFeeEntry},
        transactions::{
            base_transaction::BaseTransaction,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct AssetDividendTransaction {
    base: BaseTransaction,
}

impl TransactionProcessor for AssetDividendTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let entry = self.base.entry(|x| x.quantity >= dec!(0))?;

        let metadata = TransactionTypeDto::AssetDividend(AssetDividendMetadataDto {
            entry: entry.clone().into(),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::AssetDividend)
    }

    fn set_transaction_id(&mut self, transaction_id: Uuid) {
        self.base.set_transaction_id(transaction_id)
    }

    fn connector_link(
        &self,
    ) -> Option<&crate::entities::transactions::metadata::ConnectorLinkMeta> {
        self.base.connector_link()
    }

    fn set_connector_link(
        &mut self,
        link: Option<crate::entities::transactions::metadata::ConnectorLinkMeta>,
    ) {
        self.base.set_connector_link(link)
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
            TransactionTypeDto::AssetDividend(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        let mut base = BaseTransaction::new(
            user_id,
            dto.transaction_id,
            dto.date,
            dto.visibility,
            vec![],
        );
        base.add_fee_entries_from_dtos(dto.fee_entries)?;

        let entry = Entry::from_dto(
            metadata.entry,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetDividend,
            )
            .context("Failed to convert asset dividend category")?,
        );

        base.add_entries(vec![entry]);

        let ret = Box::new(AssetDividendTransaction { base });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(AssetDividendTransaction {
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let entry = self.base.entry(|x| x.quantity >= dec!(0))?;

        let cash_fees = self
            .base
            .entries()
            .iter()
            .filter(|x| x.is_fee())
            .map(|x| CashFeeEntry {
                asset_id: x.asset_id,
                account_id: x.account_id,
                quantity: x.quantity,
            })
            .collect();

        Ok(TransactionPortfolioAction::Referential(Box::new(
            AssetDividend {
                asset_id: entry.asset_id,
                account_id: entry.account_id,
                quantity: entry.quantity,
                price: dec!(1),
                fees: dec!(0),
                cash_fees,
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

    fn dividend_dto(account_id: Uuid, fee_entries: Vec<FeeEntryDto>) -> TransactionDto {
        TransactionDto {
            transaction_id: None,
            visibility: crate::dtos::transaction_dto::TransactionVisibilityDto::Default,
            date: datetime!(2000-03-22 00:00:00 UTC),
            fee_entries,
            transaction_type: TransactionTypeDto::AssetDividend(AssetDividendMetadataDto {
                entry: EntryDto::new(1, account_id, dec!(5)),
            }),
        }
    }

    #[test]
    fn try_from_dto_stamps_asset_dividend_category_and_withholding_fee_category() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AssetDividendTransaction::try_from_dto(
            dividend_dto(
                account_id,
                vec![fee(
                    account_id,
                    dec!(-1),
                    DatabaseFeeCategories::WithholdingTax,
                )],
            ),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        let entries = transaction.get_entries();
        assert_eq!(entries.len(), 2);

        let main_entry = entries
            .iter()
            .find(|x| x.quantity == dec!(5))
            .expect("main entry");
        assert_eq!(main_entry.category, 7);
        assert_eq!(main_entry.asset_id, 1);
        assert_eq!(main_entry.account_id, account_id);

        let fee_entry = entries
            .iter()
            .find(|x| x.quantity == dec!(-1))
            .expect("fee entry");
        assert_eq!(fee_entry.category, 8);
        assert!(fee_entry.is_fee());
    }

    #[test]
    fn try_into_dto_round_trips_entry_and_withholding_fee() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AssetDividendTransaction::try_from_dto(
            dividend_dto(
                account_id,
                vec![fee(
                    account_id,
                    dec!(-1),
                    DatabaseFeeCategories::WithholdingTax,
                )],
            ),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        let dto = transaction.try_into_dto().expect("should convert to dto");

        assert_eq!(dto.transaction_id, None);
        assert_eq!(dto.date, datetime!(2000-03-22 00:00:00 UTC));
        assert_eq!(dto.fee_entries.len(), 1);
        assert_eq!(
            dto.fee_entries[0].entry_type,
            DatabaseFeeCategories::WithholdingTax
        );
        assert_eq!(dto.fee_entries[0].entry.quantity, dec!(-1));

        match dto.transaction_type {
            TransactionTypeDto::AssetDividend(metadata) => {
                assert_eq!(metadata.entry.asset_id, 1);
                assert_eq!(metadata.entry.quantity, dec!(5));
                assert_eq!(metadata.entry.account_id, account_id);
            }
            _ => panic!("expected asset dividend metadata"),
        }
    }

    #[test]
    fn portfolio_action_opens_dividend_flagged_position_at_market_price() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AssetDividendTransaction::try_from_dto(
            dividend_dto(account_id, vec![]),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        let TransactionPortfolioAction::Referential(mut action) = transaction
            .get_portfolio_action()
            .expect("should produce portfolio action")
        else {
            panic!("expected referential portfolio action");
        };

        assert_eq!(action.get_conversion_asset_id().0, 1);
        assert_eq!(action.date(), datetime!(2000-03-22 00:00:00 UTC));

        action.apply_conversion_rate(dec!(40));

        let mut portfolio = Portfolio::new();
        action.update_porfolio(&mut portfolio);

        let asset_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio")
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio");

        assert_eq!(asset_portfolio.positions.len(), 1);
        let position = &asset_portfolio.positions[0];
        assert!(position.is_dividend());
        assert_eq!(position.add_price(), dec!(40));
        assert_eq!(position.units(), dec!(5));
        assert_eq!(position.add_date(), datetime!(2000-03-22 00:00:00 UTC));
        assert_eq!(asset_portfolio.asset_dividends(), dec!(5));
    }

    #[test]
    fn portfolio_action_price_defaults_to_one_until_conversion_rate_applied() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AssetDividendTransaction::try_from_dto(
            dividend_dto(account_id, vec![]),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        let TransactionPortfolioAction::Referential(action) = transaction
            .get_portfolio_action()
            .expect("should produce portfolio action")
        else {
            panic!("expected referential portfolio action");
        };

        let mut portfolio = Portfolio::new();
        action.update_porfolio(&mut portfolio);

        let position = &portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio")
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio")
            .positions[0];
        assert_eq!(position.add_price(), dec!(1));
    }

    #[test]
    fn withholding_fee_on_asset_dividend_accumulates_on_cash_portfolio() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AssetDividendTransaction::try_from_dto(
            dividend_dto(
                account_id,
                vec![fee(
                    account_id,
                    dec!(-1),
                    DatabaseFeeCategories::WithholdingTax,
                )],
            ),
            Uuid::new_v4(),
        )
        .expect("should build transaction");

        let mut portfolio = Portfolio::new();
        match transaction
            .get_portfolio_action()
            .expect("should produce portfolio action")
        {
            TransactionPortfolioAction::Referential(action) => {
                action.update_porfolio(&mut portfolio)
            }
            TransactionPortfolioAction::Regular(action) => action.update_porfolio(&mut portfolio),
            TransactionPortfolioAction::None => {}
        }

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio");
        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&20)
            .expect("withholding fee should accumulate on the account's cash portfolio");
        assert_eq!(cash_portfolio.fees(), dec!(1));
        assert_eq!(cash_portfolio.units(), dec!(-1));
    }
}
