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
            TransactionTypeDto::AssetSale(metadata) => metadata,
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

#[cfg(test)]
mod tests {
    use rust_decimal::Decimal;
    use time::macros::datetime;

    use crate::{
        dtos::{
            assets::asset_id_dto::AssetIdDto, entry_dto::EntryDto, fee_entry_dto::FeeEntryDto,
            fee_entry_types_dto::FeeEntryTypesDto,
        },
        entities::portfolio_overview::portfolio::{
            portfolio_asset_position_dto::PortfolioAssetPosition, Portfolio,
        },
        test_support::load_dynamic_enums,
    };

    use super::*;

    fn fee_dto(asset_id: i32, account_id: Uuid, quantity: Decimal) -> FeeEntryDto {
        FeeEntryDto {
            entry: EntryDto::new(asset_id, account_id, quantity),
            entry_type: FeeEntryTypesDto::Transaction,
        }
    }

    fn sale_dto(
        account_id: Uuid,
        units_sold: Decimal,
        proceeds: Decimal,
        fee_entries: Vec<FeeEntryDto>,
    ) -> TransactionDto {
        TransactionDto {
            transaction_id: None,
            visibility: crate::dtos::transaction_dto::TransactionVisibilityDto::Default,
            date: datetime!(2024-05-10 00:00:00 UTC),
            fee_entries,
            transaction_type: TransactionTypeDto::AssetSale(AssetSaleMetadataDto {
                sale: EntryDto::new(1, account_id, units_sold),
                proceeds: EntryDto::new(10, account_id, proceeds),
            }),
        }
    }

    fn model(
        id: i32,
        transaction_id: Uuid,
        user_id: Uuid,
        account_id: Uuid,
        asset_id: i32,
        quantity: Decimal,
        category_id: i32,
    ) -> TransactionWithEntriesModel {
        TransactionWithEntriesModel {
            id,
            asset_id,
            account_id,
            quantity,
            category_id,
            transaction_id,
            user_id,
            type_id: DatabaseTransactionTypes::AssetSale,
            visibility: "default".to_string(),
            date_transacted: datetime!(2024-05-10 00:00:00 UTC),
        }
    }

    #[test]
    fn try_from_dto_stamps_both_legs_with_asset_sale_category() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();
        let dto = sale_dto(
            account_id,
            dec!(-4),
            dec!(480),
            vec![fee_dto(10, account_id, dec!(-2))],
        );

        let txn =
            AssetSaleTransaction::try_from_dto(dto, user_id).expect("sale dto should convert");

        let entries = txn.get_entries();
        assert_eq!(entries.len(), 3);

        let asset_leg = entries
            .iter()
            .find(|e| e.quantity == dec!(-4))
            .expect("asset leg");
        assert_eq!(asset_leg.category, 4);
        assert_eq!(asset_leg.asset_id, 1);

        let cash_leg = entries
            .iter()
            .find(|e| e.quantity == dec!(480))
            .expect("proceeds leg");
        assert_eq!(cash_leg.category, 4);
        assert_eq!(cash_leg.asset_id, 10);

        let fee_leg = entries
            .iter()
            .find(|e| e.quantity == dec!(-2))
            .expect("fee entry rides along");
        assert_eq!(fee_leg.category, 2);
    }

    #[test]
    fn try_into_dto_recovers_sale_and_proceeds_legs_by_sign() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();
        let transaction_id = Uuid::new_v4();

        let txn = AssetSaleTransaction::from_transaction_with_entries_models(vec![
            model(1, transaction_id, user_id, account_id, 10, dec!(480), 4),
            model(2, transaction_id, user_id, account_id, 1, dec!(-4), 4),
            model(3, transaction_id, user_id, account_id, 10, dec!(-2), 2),
        ]);

        let dto = txn.try_into_dto().expect("entity should convert to dto");

        assert_eq!(dto.transaction_id, Some(transaction_id));
        assert_eq!(dto.date, datetime!(2024-05-10 00:00:00 UTC));

        let TransactionTypeDto::AssetSale(metadata) = dto.transaction_type else {
            panic!("expected asset sale metadata");
        };
        assert_eq!(metadata.sale.asset_id, 1);
        assert_eq!(metadata.sale.quantity, dec!(-4));
        assert_eq!(metadata.proceeds.asset_id, 10);
        assert_eq!(metadata.proceeds.quantity, dec!(480));

        assert_eq!(dto.fee_entries.len(), 1);
        assert_eq!(dto.fee_entries[0].entry.quantity, dec!(-2));
        assert_eq!(dto.fee_entries[0].entry_type, FeeEntryTypesDto::Transaction);
    }

    #[test]
    fn sale_portfolio_action_splits_realized_and_unrealized_gains_and_credits_net_cash() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();

        let mut portfolio = Portfolio::new();
        portfolio
            .get_asset_portfolio(account_id, 1)
            .add_positions(vec![PortfolioAssetPosition::new(
                dec!(100),
                dec!(10),
                datetime!(2024-03-22 00:00:00 UTC),
                dec!(5),
            )]);

        let dto = sale_dto(
            account_id,
            dec!(-4),
            dec!(480),
            vec![fee_dto(10, account_id, dec!(-2))],
        );
        let txn =
            AssetSaleTransaction::try_from_dto(dto, user_id).expect("sale dto should convert");

        let action = txn.get_portfolio_action().expect("portfolio action");
        let TransactionPortfolioAction::Referential(action) = action else {
            panic!("expected referential portfolio action");
        };
        assert_eq!(action.date(), datetime!(2024-05-10 00:00:00 UTC));
        assert_eq!(action.get_conversion_asset_id(), AssetIdDto(10));

        action.update_porfolio(&mut portfolio);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio");
        let asset_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio");
        assert_eq!(asset_portfolio.positions.len(), 1);

        let position = &asset_portfolio.positions[0];
        assert_eq!(position.amount_sold(), dec!(4));
        assert_eq!(position.get_amount_left(), dec!(6));
        assert_eq!(position.total_fees(), dec!(7));
        assert_eq!(position.get_realized_gains(), dec!(77.20));
        assert_eq!(position.get_unrealized_gains(dec!(130)), dec!(175.80));
        assert_eq!(position.get_total_gains(dec!(130)), dec!(253));

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("cash portfolio");
        assert_eq!(cash_portfolio.units(), dec!(478));
        assert_eq!(cash_portfolio.fees(), dec!(0));
    }

    #[test]
    fn portfolio_action_consumes_oldest_position_first_and_spreads_fees_by_units_sold() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();

        let mut portfolio = Portfolio::new();
        portfolio
            .get_asset_portfolio(account_id, 1)
            .add_positions(vec![
                PortfolioAssetPosition::new(
                    dec!(100),
                    dec!(5),
                    datetime!(2024-03-22 00:00:00 UTC),
                    dec!(0),
                ),
                PortfolioAssetPosition::new(
                    dec!(110),
                    dec!(5),
                    datetime!(2024-03-23 00:00:00 UTC),
                    dec!(0),
                ),
            ]);

        let dto = sale_dto(
            account_id,
            dec!(-8),
            dec!(960),
            vec![fee_dto(10, account_id, dec!(-8))],
        );
        let txn =
            AssetSaleTransaction::try_from_dto(dto, user_id).expect("sale dto should convert");
        let action = txn.get_portfolio_action().expect("portfolio action");
        let TransactionPortfolioAction::Referential(action) = action else {
            panic!("expected referential portfolio action");
        };
        action.update_porfolio(&mut portfolio);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio");
        let asset_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio");
        assert_eq!(asset_portfolio.positions.len(), 2);

        let newer = &asset_portfolio.positions[0];
        assert_eq!(newer.add_date(), datetime!(2024-03-23 00:00:00 UTC));
        assert_eq!(newer.amount_sold(), dec!(3));
        assert_eq!(newer.total_fees(), dec!(3));

        let older = &asset_portfolio.positions[1];
        assert_eq!(older.add_date(), datetime!(2024-03-22 00:00:00 UTC));
        assert_eq!(older.amount_sold(), dec!(5));
        assert_eq!(older.total_fees(), dec!(5));

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("cash portfolio");
        assert_eq!(cash_portfolio.units(), dec!(952));
    }

    #[test]
    fn portfolio_action_oversell_consumes_all_recorded_units() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();

        let mut portfolio = Portfolio::new();
        portfolio
            .get_asset_portfolio(account_id, 1)
            .add_positions(vec![PortfolioAssetPosition::new(
                dec!(100),
                dec!(5),
                datetime!(2024-03-22 00:00:00 UTC),
                dec!(0),
            )]);

        let dto = sale_dto(account_id, dec!(-10), dec!(1200), vec![]);
        let txn =
            AssetSaleTransaction::try_from_dto(dto, user_id).expect("sale dto should convert");
        let action = txn.get_portfolio_action().expect("portfolio action");
        let TransactionPortfolioAction::Referential(action) = action else {
            panic!("expected referential portfolio action");
        };
        action.update_porfolio(&mut portfolio);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio");
        let asset_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("asset portfolio");
        assert_eq!(asset_portfolio.positions.len(), 1);
        assert_eq!(asset_portfolio.positions[0].amount_sold(), dec!(5));
        assert_eq!(asset_portfolio.positions[0].get_amount_left(), dec!(0));

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("cash portfolio");
        assert_eq!(cash_portfolio.units(), dec!(1200));
    }
}
