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
    dtos::transaction_dto::{AssetTransferInMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::asset_transfer_in::AssetTransferIn,
        transactions::{
            base_transaction::BaseTransaction,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct AssetTransferInTransaction {
    base: BaseTransaction,
}

impl TransactionProcessor for AssetTransferInTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let entry = self.base.entry(|x| x.quantity >= dec!(0))?;

        let metadata = TransactionTypeDto::AssetTransferIn(AssetTransferInMetadataDto {
            entry: entry.clone().into(),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::AssetTransferIn)
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
            TransactionTypeDto::AssetTransferIn(metadata) => metadata,
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
                DatabaseTransactionTypeCategories::AssetTransferIn,
            )
            .context("Failed to convert asset transfer in category")?,
        );

        base.add_entries(vec![entry]);

        let ret = Box::new(AssetTransferInTransaction { base });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(AssetTransferInTransaction {
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let entry = self.base.entry(|x| x.quantity >= dec!(0))?;

        Ok(TransactionPortfolioAction::Referential(Box::new(
            AssetTransferIn {
                asset_id: entry.asset_id,
                account_id: entry.account_id,
                quantity: entry.quantity,
                price: dec!(1),
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

    fn transfer_in_dto(account_id: Uuid, fee_entries: Vec<FeeEntryDto>) -> TransactionDto {
        TransactionDto {
            transaction_id: None,
            visibility: crate::dtos::transaction_dto::TransactionVisibilityDto::Default,
            date: datetime!(2000-03-22 00:00:00 UTC),
            fee_entries,
            transaction_type: TransactionTypeDto::AssetTransferIn(AssetTransferInMetadataDto {
                entry: EntryDto::new(1, account_id, dec!(4)),
            }),
        }
    }

    #[test]
    fn try_from_dto_stamps_transfer_in_category_and_fee_category() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AssetTransferInTransaction::try_from_dto(
            transfer_in_dto(
                account_id,
                vec![fee(
                    account_id,
                    dec!(-3),
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
            .find(|x| x.quantity == dec!(4))
            .expect("main entry");
        assert_eq!(main_entry.category, 11);
        assert_eq!(main_entry.asset_id, 1);
        assert_eq!(main_entry.account_id, account_id);

        let fee_entry = entries
            .iter()
            .find(|x| x.quantity == dec!(-3))
            .expect("fee entry");
        assert_eq!(fee_entry.category, 2);
        assert!(fee_entry.is_fee());
    }

    #[test]
    fn try_into_dto_round_trips_entry_and_fee_entries() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AssetTransferInTransaction::try_from_dto(
            transfer_in_dto(
                account_id,
                vec![fee(
                    account_id,
                    dec!(-3),
                    DatabaseFeeCategories::Transaction,
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
            DatabaseFeeCategories::Transaction
        );
        assert_eq!(dto.fee_entries[0].entry.quantity, dec!(-3));
        assert_eq!(dto.fee_entries[0].entry.asset_id, 20);

        match dto.transaction_type {
            TransactionTypeDto::AssetTransferIn(metadata) => {
                assert_eq!(metadata.entry.asset_id, 1);
                assert_eq!(metadata.entry.quantity, dec!(4));
                assert_eq!(metadata.entry.account_id, account_id);
            }
            _ => panic!("expected asset transfer in metadata"),
        }
    }

    #[test]
    fn portfolio_action_opens_position_at_market_price_with_transfer_fees() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AssetTransferInTransaction::try_from_dto(
            transfer_in_dto(
                account_id,
                vec![fee(
                    account_id,
                    dec!(-3),
                    DatabaseFeeCategories::Transaction,
                )],
            ),
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

        action.apply_conversion_rate(dec!(25));

        let mut portfolio = Portfolio::new();
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
        assert_eq!(position.add_price(), dec!(25));
        assert_eq!(position.units(), dec!(4));
        assert_eq!(position.total_fees(), dec!(3));
        assert_eq!(position.get_total_cost_basis(), dec!(103));
        assert!(!position.is_dividend());
        assert_eq!(position.add_date(), datetime!(2000-03-22 00:00:00 UTC));
    }

    #[test]
    fn portfolio_action_price_defaults_to_one_until_conversion_rate_applied() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();

        let transaction = AssetTransferInTransaction::try_from_dto(
            transfer_in_dto(account_id, vec![]),
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
}
