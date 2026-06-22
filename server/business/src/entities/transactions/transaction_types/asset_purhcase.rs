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
    dtos::transaction_dto::{AssetPurchaseMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::asset_purchase::AssetPurchase,
        transactions::{
            base_transaction::BaseTransaction,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct AssetPurchaseTransaction {
    base: BaseTransaction,
}

impl TransactionProcessor for AssetPurchaseTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let purchase_entry = self.base.entry(|x| x.quantity > dec!(0))?;
        let sale_entry = self.base.entry(|x| x.quantity <= dec!(0))?;

        let metadata = TransactionTypeDto::AssetPurchase(AssetPurchaseMetadataDto {
            purchase: purchase_entry.clone().into(),
            sale: sale_entry.clone().into(),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::AssetPurchase)
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
            TransactionTypeDto::AssetPurchase(metadata) => metadata,
            _ => panic!("Invalid transaction type"),
        };

        let mut base = BaseTransaction::new(user_id, dto.transaction_id, dto.date, vec![]);
        base.add_fee_entries_from_dtos(dto.fee_entries)?;

        let purchase_entry = Entry::from_dto(
            metadata.purchase,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetPurchase,
            )
            .context("Failed to convert fee category")?,
        );

        let sale_entry = Entry::from_dto(
            metadata.sale,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetPurchase,
            )
            .context("Failed to convert fee category")?,
        );

        base.add_entries(vec![purchase_entry, sale_entry]);

        let ret = Box::new(AssetPurchaseTransaction { base });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(AssetPurchaseTransaction {
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let purchase_entry = self.base.entry(|x| x.quantity > dec!(0))?;
        let sale_entry = self.base.entry(|x| x.quantity <= dec!(0))?;

        let fee_total = self.base.fee_entries_total();
        let cash_units = sale_entry.quantity.abs() - fee_total;
        Ok(TransactionPortfolioAction::Referential(Box::new(
            AssetPurchase {
                instrument_asset_id: purchase_entry.asset_id,
                account_id: purchase_entry.account_id,
                instrument_units: purchase_entry.quantity,
                instrument_price: sale_entry.quantity.abs() / purchase_entry.quantity,
                fees: fee_total.abs(),
                cash_asset_id: sale_entry.asset_id,
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
        entities::portfolio_overview::portfolio::Portfolio,
        test_support::load_dynamic_enums,
    };

    use super::*;

    fn fee_dto(asset_id: i32, account_id: Uuid, quantity: Decimal) -> FeeEntryDto {
        FeeEntryDto {
            entry: EntryDto::new(asset_id, account_id, quantity),
            entry_type: FeeEntryTypesDto::Transaction,
        }
    }

    fn purchase_dto(
        account_id: Uuid,
        transaction_id: Option<Uuid>,
        fee_entries: Vec<FeeEntryDto>,
    ) -> TransactionDto {
        TransactionDto {
            transaction_id,
            date: datetime!(2024-05-01 00:00:00 UTC),
            fee_entries,
            transaction_type: TransactionTypeDto::AssetPurchase(AssetPurchaseMetadataDto {
                purchase: EntryDto::new(1, account_id, dec!(2)),
                sale: EntryDto::new(10, account_id, dec!(-200)),
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
            type_id: DatabaseTransactionTypes::AssetPurchase,
            date_transacted: datetime!(2024-05-01 00:00:00 UTC),
        }
    }

    #[test]
    fn try_from_dto_stamps_both_legs_with_asset_purchase_category() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();
        let transaction_id = Uuid::new_v4();
        let dto = purchase_dto(
            account_id,
            Some(transaction_id),
            vec![fee_dto(10, account_id, dec!(-1))],
        );

        let txn = AssetPurchaseTransaction::try_from_dto(dto, user_id)
            .expect("purchase dto should convert");

        assert_eq!(txn.get_transaction_id(), Some(transaction_id));
        let entries = txn.get_entries();
        assert_eq!(entries.len(), 3);

        let asset_leg = entries
            .iter()
            .find(|e| e.quantity == dec!(2))
            .expect("asset leg");
        assert_eq!(asset_leg.category, 3);
        assert_eq!(asset_leg.asset_id, 1);

        let cash_leg = entries
            .iter()
            .find(|e| e.quantity == dec!(-200))
            .expect("cash leg");
        assert_eq!(cash_leg.category, 3);
        assert_eq!(cash_leg.asset_id, 10);

        let fee_leg = entries
            .iter()
            .find(|e| e.quantity == dec!(-1))
            .expect("fee entry rides along");
        assert_eq!(fee_leg.category, 2);
    }

    #[test]
    fn try_into_dto_recovers_purchase_and_sale_legs_by_sign() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();
        let transaction_id = Uuid::new_v4();

        let txn = AssetPurchaseTransaction::from_transaction_with_entries_models(vec![
            model(1, transaction_id, user_id, account_id, 10, dec!(-200), 3),
            model(2, transaction_id, user_id, account_id, 1, dec!(2), 3),
            model(3, transaction_id, user_id, account_id, 10, dec!(-1), 2),
        ]);

        let dto = txn.try_into_dto().expect("entity should convert to dto");

        assert_eq!(dto.transaction_id, Some(transaction_id));
        assert_eq!(dto.date, datetime!(2024-05-01 00:00:00 UTC));

        let TransactionTypeDto::AssetPurchase(metadata) = dto.transaction_type else {
            panic!("expected asset purchase metadata");
        };
        assert_eq!(metadata.purchase.asset_id, 1);
        assert_eq!(metadata.purchase.quantity, dec!(2));
        assert_eq!(metadata.sale.asset_id, 10);
        assert_eq!(metadata.sale.quantity, dec!(-200));

        assert_eq!(dto.fee_entries.len(), 1);
        assert_eq!(dto.fee_entries[0].entry.quantity, dec!(-1));
        assert_eq!(dto.fee_entries[0].entry_type, FeeEntryTypesDto::Transaction);
    }

    #[test]
    fn portfolio_action_opens_position_at_cash_price_and_drops_cash_including_fees() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let account_id = Uuid::new_v4();
        let dto = purchase_dto(account_id, None, vec![fee_dto(10, account_id, dec!(-1))]);
        let txn = AssetPurchaseTransaction::try_from_dto(dto, user_id)
            .expect("purchase dto should convert");

        let action = txn.get_portfolio_action().expect("portfolio action");
        let TransactionPortfolioAction::Referential(action) = action else {
            panic!("expected referential portfolio action");
        };
        assert_eq!(action.date(), datetime!(2024-05-01 00:00:00 UTC));
        assert_eq!(action.get_conversion_asset_id(), AssetIdDto(10));

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
        assert_eq!(position.add_price(), dec!(100));
        assert_eq!(position.units(), dec!(2));
        assert_eq!(position.total_fees(), dec!(1));
        assert_eq!(position.get_total_cost_basis(), dec!(201));
        assert_eq!(position.get_unit_cost_basis(), dec!(100.5));
        assert_eq!(position.add_date(), datetime!(2024-05-01 00:00:00 UTC));

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("cash portfolio");
        assert_eq!(cash_portfolio.units(), dec!(-201));
        assert_eq!(cash_portfolio.fees(), dec!(0));
    }

    #[test]
    fn try_from_dto_accepts_mismatched_leg_accounts() {
        load_dynamic_enums();
        let user_id = Uuid::new_v4();
        let asset_account = Uuid::new_v4();
        let cash_account = Uuid::new_v4();
        let dto = TransactionDto {
            transaction_id: None,
            date: datetime!(2024-05-01 00:00:00 UTC),
            fee_entries: vec![],
            transaction_type: TransactionTypeDto::AssetPurchase(AssetPurchaseMetadataDto {
                purchase: EntryDto::new(1, asset_account, dec!(2)),
                sale: EntryDto::new(10, cash_account, dec!(-200)),
            }),
        };

        let txn = AssetPurchaseTransaction::try_from_dto(dto, user_id)
            .expect("mismatched accounts are not validated");

        let action = txn.get_portfolio_action().expect("portfolio action");
        let TransactionPortfolioAction::Referential(action) = action else {
            panic!("expected referential portfolio action");
        };
        let mut portfolio = Portfolio::new();
        action.update_porfolio(&mut portfolio);

        let asset_side = portfolio
            .account_portfolios()
            .get(&asset_account)
            .expect("asset leg account");
        assert_eq!(asset_side.asset_portfolios.len(), 1);
        assert_eq!(
            asset_side
                .cash_portfolios
                .get(&10)
                .expect("cash portfolio in the purchase leg's account")
                .units(),
            dec!(-200)
        );

        assert!(portfolio.account_portfolios().get(&cash_account).is_none());
    }
}
