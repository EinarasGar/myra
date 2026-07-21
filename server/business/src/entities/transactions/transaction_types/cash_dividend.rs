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
    dtos::transaction_dto::{CashDividendMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::cash_dividend::CashDividend,
        transactions::{
            base_transaction::BaseTransaction,
            metadata::MetadataField,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct CashDividendTransaction {
    base: BaseTransaction,
    origin_asset_id: Option<i32>,
}

impl TransactionProcessor for CashDividendTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let entry = self.base.entry(|x| x.quantity >= dec!(0))?;

        let metadata = TransactionTypeDto::CashDividend(CashDividendMetadataDto {
            entry: entry.clone().into(),
            origin_asset_id: self.origin_asset_id.unwrap_or(0),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::CashDividend)
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

    fn get_metadata_fields(&self) -> Vec<MetadataField> {
        vec![MetadataField::Dividends(self.origin_asset_id)]
    }

    fn set_metadata_fields(&mut self, field: MetadataField) {
        if let MetadataField::Dividends(origin_asset_id) = field {
            self.origin_asset_id = origin_asset_id;
        } else {
            panic!("CashDividend transaction only supports Dividends metadata");
        }
    }

    fn try_from_dto(dto: TransactionDto, user_id: Uuid) -> Result<Transaction> {
        let metadata = match dto.transaction_type {
            TransactionTypeDto::CashDividend(metadata) => metadata,
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
                DatabaseTransactionTypeCategories::CashDividend,
            )
            .context("Failed to convert cash dividend category")?,
        );

        base.add_entries(vec![entry]);

        let ret = Box::new(CashDividendTransaction {
            base,
            origin_asset_id: Some(metadata.origin_asset_id),
        });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(CashDividendTransaction {
            base: BaseTransaction::from_models(models),
            origin_asset_id: None,
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let Some(origin_asset_id) = self.origin_asset_id else {
            tracing::warn!(
                "cash dividend missing origin_asset_id metadata, skipping portfolio action"
            );
            return Ok(TransactionPortfolioAction::None);
        };

        let entry = self.base.entry(|x| x.quantity >= dec!(0))?;

        Ok(TransactionPortfolioAction::Referential(Box::new(
            CashDividend {
                asset_id: entry.asset_id,
                account_id: entry.account_id,
                quantity: entry.quantity,
                origin_asset_id,
                price: dec!(1),
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

    const ORIGIN_ASSET_ID: i32 = 77;

    fn dividend_dto(
        account_id: Uuid,
        quantity: Decimal,
        withholding_quantities: Vec<Decimal>,
    ) -> TransactionDto {
        TransactionDto {
            transaction_id: None,
            visibility: crate::dtos::transaction_dto::TransactionVisibilityDto::Default,
            date: datetime!(2000-03-22 00:00:00 UTC),
            fee_entries: withholding_quantities
                .into_iter()
                .map(|q| FeeEntryDto {
                    entry: EntryDto::new(10, account_id, q),
                    entry_type: FeeCategoeis::WithholdingTax,
                })
                .collect(),
            transaction_type: TransactionTypeDto::CashDividend(CashDividendMetadataDto {
                entry: EntryDto::new(10, account_id, quantity),
                origin_asset_id: ORIGIN_ASSET_ID,
            }),
        }
    }

    #[test]
    fn try_from_dto_stamps_reserved_cash_dividend_category_and_origin_metadata() {
        crate::test_support::load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let dto = dividend_dto(account_id, dec!(10), vec![dec!(-1)]);

        let transaction = CashDividendTransaction::try_from_dto(dto, Uuid::new_v4())
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
                DatabaseTransactionTypeCategories::CashDividend,
            )
            .expect("cash dividend category id")
        );
        assert_eq!(main.asset_id, 10);
        assert_eq!(main.account_id, account_id);
        assert_eq!(main.quantity, dec!(10));

        let fee = entries
            .iter()
            .find(|e| e.is_fee())
            .expect("withholding entry missing");
        assert_eq!(fee.quantity, dec!(-1));
        assert_eq!(
            fee.category,
            FeeCategories::try_into_dynamic_enum(FeeCategoeis::WithholdingTax)
                .expect("withholding tax category id")
        );

        let fields = transaction.get_metadata_fields();
        assert_eq!(fields.len(), 1);
        assert!(matches!(
            fields[0],
            MetadataField::Dividends(Some(ORIGIN_ASSET_ID))
        ));
    }

    #[test]
    fn try_into_dto_round_trips_entry_origin_and_withholding_fee() {
        crate::test_support::load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let dto = dividend_dto(account_id, dec!(10), vec![dec!(-1)]);

        let transaction = CashDividendTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("try_from_dto failed");
        let round_trip = transaction.try_into_dto().expect("try_into_dto failed");

        assert_eq!(round_trip.transaction_id, None);
        assert_eq!(round_trip.date, datetime!(2000-03-22 00:00:00 UTC));

        match round_trip.transaction_type {
            TransactionTypeDto::CashDividend(metadata) => {
                assert_eq!(metadata.origin_asset_id, ORIGIN_ASSET_ID);
                assert_eq!(metadata.entry.asset_id, 10);
                assert_eq!(metadata.entry.account_id, account_id);
                assert_eq!(metadata.entry.quantity, dec!(10));
            }
            _ => panic!("Expected cash dividend metadata"),
        }

        assert_eq!(round_trip.fee_entries.len(), 1);
        assert_eq!(round_trip.fee_entries[0].entry.quantity, dec!(-1));
        assert_eq!(
            round_trip.fee_entries[0].entry_type,
            FeeCategoeis::WithholdingTax
        );
    }

    #[test]
    fn get_portfolio_action_raises_cash_net_of_withholding_and_records_gross_dividend() {
        crate::test_support::load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let dto = dividend_dto(account_id, dec!(10), vec![dec!(-1)]);

        let transaction = CashDividendTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("try_from_dto failed");
        let action = transaction
            .get_portfolio_action()
            .expect("get_portfolio_action failed");

        let TransactionPortfolioAction::Referential(action) = action else {
            panic!("Expected referential portfolio action");
        };
        assert_eq!(action.date(), datetime!(2000-03-22 00:00:00 UTC));

        let mut portfolio = Portfolio::new();
        action.update_porfolio(&mut portfolio);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio missing");
        let cash = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("cash portfolio missing");
        assert_eq!(cash.units(), dec!(9));
        assert_eq!(cash.fees(), dec!(1));
        assert_eq!(cash.dividends(), dec!(10));

        let origin_portfolio = account_portfolio
            .asset_portfolios
            .get(&ORIGIN_ASSET_ID)
            .expect("origin asset portfolio missing");
        assert_eq!(origin_portfolio.cash_dividends(), dec!(10));
    }

    #[test]
    fn get_portfolio_action_without_origin_metadata_is_none() {
        crate::test_support::load_dynamic_enums();
        let dto = dividend_dto(Uuid::new_v4(), dec!(10), vec![]);

        let mut transaction = CashDividendTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("try_from_dto failed");
        transaction.set_metadata_fields(MetadataField::Dividends(None));

        let action = transaction
            .get_portfolio_action()
            .expect("get_portfolio_action failed");
        assert!(matches!(action, TransactionPortfolioAction::None));
    }
}
