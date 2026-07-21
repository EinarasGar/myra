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
    dtos::transaction_dto::{AssetTradeMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::asset_trade::AssetTrade,
        transactions::{
            base_transaction::BaseTransaction,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct AssetTradeTransaction {
    base: BaseTransaction,
}

impl TransactionProcessor for AssetTradeTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let outgoing_entry = self.base.entry(|x| x.quantity < dec!(0))?;
        let incoming_entry = self.base.entry(|x| x.quantity > dec!(0))?;

        let metadata = TransactionTypeDto::AssetTrade(AssetTradeMetadataDto {
            outgoing_entry: outgoing_entry.clone().into(),
            incoming_entry: incoming_entry.clone().into(),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::AssetTrade)
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
            TransactionTypeDto::AssetTrade(metadata) => metadata,
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

        let outgoing_entry = Entry::from_dto(
            metadata.outgoing_entry,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetTrade,
            )
            .context("Failed to convert asset trade category")?,
        );

        let incoming_entry = Entry::from_dto(
            metadata.incoming_entry,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetTrade,
            )
            .context("Failed to convert asset trade category")?,
        );

        base.add_entries(vec![outgoing_entry, incoming_entry]);

        let ret = Box::new(AssetTradeTransaction { base });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(AssetTradeTransaction {
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let outgoing_entry = self.base.entry(|x| x.quantity < dec!(0))?;
        let incoming_entry = self.base.entry(|x| x.quantity > dec!(0))?;

        Ok(TransactionPortfolioAction::Referential(Box::new(
            AssetTrade {
                account_id: outgoing_entry.account_id,
                outgoing_asset_id: outgoing_entry.asset_id,
                outgoing_quantity: outgoing_entry.quantity.abs(),
                incoming_asset_id: incoming_entry.asset_id,
                incoming_quantity: incoming_entry.quantity,
                incoming_price: outgoing_entry.quantity.abs() / incoming_entry.quantity,
                fees: self.base.fee_entries_total().abs(),
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
            entry_type: FeeEntryTypesDto::Exchange,
        }
    }

    fn trade_dto(
        account_id: Uuid,
        outgoing_quantity: Decimal,
        incoming_quantity: Decimal,
        fee_entries: Vec<FeeEntryDto>,
    ) -> TransactionDto {
        TransactionDto {
            transaction_id: None,
            visibility: crate::dtos::transaction_dto::TransactionVisibilityDto::Default,
            date: datetime!(2024-05-20 00:00:00 UTC),
            fee_entries,
            transaction_type: TransactionTypeDto::AssetTrade(AssetTradeMetadataDto {
                outgoing_entry: EntryDto::new(1, account_id, outgoing_quantity),
                incoming_entry: EntryDto::new(2, account_id, incoming_quantity),
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
            type_id: DatabaseTransactionTypes::AssetTrade,
            visibility: "default".to_string(),
            date_transacted: datetime!(2024-05-20 00:00:00 UTC),
        }
    }

    #[test]
    fn try_from_dto_stamps_both_legs_with_asset_trade_category() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();
        let dto = trade_dto(
            account_id,
            dec!(-5),
            dec!(20),
            vec![fee_dto(10, account_id, dec!(-2))],
        );

        let txn =
            AssetTradeTransaction::try_from_dto(dto, user_id).expect("trade dto should convert");

        let entries = txn.get_entries();
        assert_eq!(entries.len(), 3);

        let outgoing_leg = entries
            .iter()
            .find(|e| e.quantity == dec!(-5))
            .expect("outgoing leg");
        assert_eq!(outgoing_leg.category, 12);
        assert_eq!(outgoing_leg.asset_id, 1);

        let incoming_leg = entries
            .iter()
            .find(|e| e.quantity == dec!(20))
            .expect("incoming leg");
        assert_eq!(incoming_leg.category, 12);
        assert_eq!(incoming_leg.asset_id, 2);

        let fee_leg = entries
            .iter()
            .find(|e| e.quantity == dec!(-2))
            .expect("fee entry rides along");
        assert_eq!(fee_leg.category, 1);
    }

    #[test]
    fn try_into_dto_recovers_outgoing_and_incoming_legs_by_sign() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();
        let transaction_id = Uuid::new_v4();

        let txn = AssetTradeTransaction::from_transaction_with_entries_models(vec![
            model(1, transaction_id, user_id, account_id, 2, dec!(14), 12),
            model(2, transaction_id, user_id, account_id, 1, dec!(-7), 12),
            model(3, transaction_id, user_id, account_id, 10, dec!(-1), 1),
        ]);

        let dto = txn.try_into_dto().expect("entity should convert to dto");

        assert_eq!(dto.transaction_id, Some(transaction_id));
        assert_eq!(dto.date, datetime!(2024-05-20 00:00:00 UTC));

        let TransactionTypeDto::AssetTrade(metadata) = dto.transaction_type else {
            panic!("expected asset trade metadata");
        };
        assert_eq!(metadata.outgoing_entry.asset_id, 1);
        assert_eq!(metadata.outgoing_entry.quantity, dec!(-7));
        assert_eq!(metadata.incoming_entry.asset_id, 2);
        assert_eq!(metadata.incoming_entry.quantity, dec!(14));

        assert_eq!(dto.fee_entries.len(), 1);
        assert_eq!(dto.fee_entries[0].entry.quantity, dec!(-1));
        assert_eq!(dto.fee_entries[0].entry_type, FeeEntryTypesDto::Exchange);
    }

    #[test]
    fn portfolio_action_moves_units_oldest_first_and_prices_incoming_at_value_given_up() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();

        let mut portfolio = Portfolio::new();
        portfolio
            .get_asset_portfolio(account_id, 1)
            .add_positions(vec![
                PortfolioAssetPosition::new(
                    dec!(10),
                    dec!(5),
                    datetime!(2024-03-20 00:00:00 UTC),
                    dec!(0),
                ),
                PortfolioAssetPosition::new(
                    dec!(12),
                    dec!(5),
                    datetime!(2024-03-21 00:00:00 UTC),
                    dec!(0),
                ),
            ]);

        let dto = trade_dto(account_id, dec!(-7), dec!(14), vec![]);
        let txn =
            AssetTradeTransaction::try_from_dto(dto, user_id).expect("trade dto should convert");

        let action = txn.get_portfolio_action().expect("portfolio action");
        let TransactionPortfolioAction::Referential(mut action) = action else {
            panic!("expected referential portfolio action");
        };
        assert_eq!(action.date(), datetime!(2024-05-20 00:00:00 UTC));
        assert_eq!(action.get_conversion_asset_id(), AssetIdDto(1));

        action.apply_conversion_rate(dec!(20));
        action.update_porfolio(&mut portfolio);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio");

        let outgoing_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("outgoing asset portfolio");
        assert_eq!(outgoing_portfolio.positions.len(), 1);
        assert_eq!(
            outgoing_portfolio.positions[0].add_date(),
            datetime!(2024-03-21 00:00:00 UTC)
        );
        assert_eq!(outgoing_portfolio.positions[0].units(), dec!(3));

        let incoming_portfolio = account_portfolio
            .asset_portfolios
            .get(&2)
            .expect("incoming asset portfolio");
        assert_eq!(incoming_portfolio.positions.len(), 1);
        let incoming_position = &incoming_portfolio.positions[0];
        assert_eq!(incoming_position.add_price(), dec!(10));
        assert_eq!(incoming_position.units(), dec!(14));
        assert_eq!(
            incoming_position.add_date(),
            datetime!(2024-05-20 00:00:00 UTC)
        );

        assert!(account_portfolio.cash_portfolios.is_empty());
    }

    #[test]
    fn portfolio_action_prices_incoming_from_legs_when_no_conversion_is_applied() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();

        let mut portfolio = Portfolio::new();
        portfolio
            .get_asset_portfolio(account_id, 1)
            .add_positions(vec![PortfolioAssetPosition::new(
                dec!(1),
                dec!(5),
                datetime!(2024-03-20 00:00:00 UTC),
                dec!(0),
            )]);

        let dto = trade_dto(account_id, dec!(-5), dec!(20), vec![]);
        let txn =
            AssetTradeTransaction::try_from_dto(dto, user_id).expect("trade dto should convert");
        let action = txn.get_portfolio_action().expect("portfolio action");
        let TransactionPortfolioAction::Referential(action) = action else {
            panic!("expected referential portfolio action");
        };
        action.update_porfolio(&mut portfolio);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio");
        let incoming_portfolio = account_portfolio
            .asset_portfolios
            .get(&2)
            .expect("incoming asset portfolio");
        assert_eq!(incoming_portfolio.positions.len(), 1);
        assert_eq!(incoming_portfolio.positions[0].add_price(), dec!(0.25));
    }

    #[test]
    fn portfolio_action_keeps_trade_fees_with_disposed_positions() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();

        let mut portfolio = Portfolio::new();
        portfolio
            .get_asset_portfolio(account_id, 1)
            .add_positions(vec![PortfolioAssetPosition::new(
                dec!(10),
                dec!(10),
                datetime!(2024-03-20 00:00:00 UTC),
                dec!(4),
            )]);

        let dto = trade_dto(
            account_id,
            dec!(-5),
            dec!(20),
            vec![fee_dto(10, account_id, dec!(-2))],
        );
        let txn =
            AssetTradeTransaction::try_from_dto(dto, user_id).expect("trade dto should convert");
        let action = txn.get_portfolio_action().expect("portfolio action");
        let TransactionPortfolioAction::Referential(mut action) = action else {
            panic!("expected referential portfolio action");
        };
        action.apply_conversion_rate(dec!(1));
        action.update_porfolio(&mut portfolio);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("account portfolio");

        let outgoing_portfolio = account_portfolio
            .asset_portfolios
            .get(&1)
            .expect("outgoing asset portfolio");
        assert_eq!(outgoing_portfolio.positions.len(), 1);
        assert_eq!(outgoing_portfolio.positions[0].units(), dec!(5));
        assert_eq!(outgoing_portfolio.positions[0].total_fees(), dec!(2));

        let incoming_portfolio = account_portfolio
            .asset_portfolios
            .get(&2)
            .expect("incoming asset portfolio");
        assert_eq!(incoming_portfolio.positions.len(), 1);
        let incoming_position = &incoming_portfolio.positions[0];
        assert_eq!(incoming_position.add_price(), dec!(0.25));
        assert_eq!(incoming_position.total_fees(), dec!(0));
    }
}
