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
    dtos::transaction_dto::{AssetBalanceTransferMetadataDto, TransactionDto, TransactionTypeDto},
    dynamic_enums::{transaction_type_categories::TransactionTypeCategories, DynamicEnum},
    entities::{
        entries::entry::Entry,
        portfolio_overview::investment_transaction::asset_balance_transfer::AssetBalanceTransfer,
        transactions::{
            base_transaction::BaseTransaction,
            transaction::{Transaction, TransactionPortfolioAction},
        },
    },
};

use super::TransactionProcessor;

pub struct AssetBalanceTransferTransaction {
    base: BaseTransaction,
}

impl TransactionProcessor for AssetBalanceTransferTransaction {
    fn try_into_dto(&self) -> Result<TransactionDto> {
        let outgoing_change = self.base.entry(|x| x.quantity < dec!(0))?;
        let incoming_change = self.base.entry(|x| x.quantity > dec!(0))?;

        let metadata = TransactionTypeDto::AssetBalanceTransfer(AssetBalanceTransferMetadataDto {
            outgoing_change: outgoing_change.clone().into(),
            incoming_change: incoming_change.clone().into(),
        });

        self.base.try_into_dto(metadata)
    }

    fn get_add_transaction_model(&self) -> AddTransactionModel {
        self.base
            .get_add_transaction_model(DatabaseTransactionTypes::AssetBalanceTransfer)
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
            TransactionTypeDto::AssetBalanceTransfer(metadata) => metadata,
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
            metadata.outgoing_change,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetBalanceTransfer,
            )
            .context("Failed to convert asset balance transfer category")?,
        );

        let incoming_entry = Entry::from_dto(
            metadata.incoming_change,
            TransactionTypeCategories::try_into_dynamic_enum(
                DatabaseTransactionTypeCategories::AssetBalanceTransfer,
            )
            .context("Failed to convert asset balance transfer category")?,
        );

        base.add_entries(vec![outgoing_entry, incoming_entry]);

        let ret = Box::new(AssetBalanceTransferTransaction { base });
        Ok(ret)
    }

    fn from_transaction_with_entries_models(
        models: Vec<TransactionWithEntriesModel>,
    ) -> Transaction {
        Box::new(AssetBalanceTransferTransaction {
            base: BaseTransaction::from_models(models),
        })
    }

    fn get_portfolio_action(&self) -> Result<TransactionPortfolioAction> {
        let outgoing_entry = self.base.entry(|x| x.quantity < dec!(0))?;
        let incoming_entry = self.base.entry(|x| x.quantity > dec!(0))?;

        Ok(TransactionPortfolioAction::Regular(Box::new(
            AssetBalanceTransfer {
                asset_id: outgoing_entry.asset_id,
                account_from: outgoing_entry.account_id,
                account_to: incoming_entry.account_id,
                quantity: incoming_entry.quantity,
                fees: self.base.fee_entries_total().abs(),
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

    use crate::{
        dtos::{
            entry_dto::EntryDto, fee_entry_dto::FeeEntryDto, fee_entry_types_dto::FeeEntryTypesDto,
        },
        entities::portfolio_overview::{
            investment_transaction::asset_transfer_in::AssetTransferIn,
            portfolio::{Portfolio, PortfolioAction},
        },
        test_support::load_dynamic_enums,
    };

    use super::*;

    fn transfer_dto(
        account_from: Uuid,
        account_to: Uuid,
        outgoing_quantity: Decimal,
        incoming_quantity: Decimal,
        fee_entries: Vec<FeeEntryDto>,
    ) -> TransactionDto {
        TransactionDto {
            transaction_id: None,
            visibility: crate::dtos::transaction_dto::TransactionVisibilityDto::Default,
            date: datetime!(2000-03-23 00:00:00 UTC),
            fee_entries,
            transaction_type: TransactionTypeDto::AssetBalanceTransfer(
                AssetBalanceTransferMetadataDto {
                    outgoing_change: EntryDto::new(1, account_from, outgoing_quantity),
                    incoming_change: EntryDto::new(1, account_to, incoming_quantity),
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
    fn try_from_dto_stamps_both_entries_with_asset_balance_transfer_category() {
        load_dynamic_enums();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();
        let dto = transfer_dto(account_from, account_to, dec!(-2), dec!(2), vec![]);

        let transaction = AssetBalanceTransferTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("valid asset balance transfer dto");

        let entries = transaction.get_entries();
        assert_eq!(entries.len(), 2);
        assert!(entries.iter().all(|x| x.category == 13));
        assert_eq!(entries[0].quantity, dec!(-2));
        assert_eq!(entries[0].account_id, account_from);
        assert_eq!(entries[1].quantity, dec!(2));
        assert_eq!(entries[1].account_id, account_to);
    }

    #[test]
    fn portfolio_action_moves_lots_intact_with_transfer_fees_attached() {
        load_dynamic_enums();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();
        let fee_entries = vec![
            FeeEntryDto {
                entry: EntryDto::new(1, account_from, dec!(-1)),
                entry_type: FeeEntryTypesDto::Transaction,
            },
            FeeEntryDto {
                entry: EntryDto::new(1, account_from, dec!(-0.5)),
                entry_type: FeeEntryTypesDto::Exchange,
            },
        ];
        let dto = transfer_dto(account_from, account_to, dec!(-2), dec!(2), fee_entries);
        let transaction = AssetBalanceTransferTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("valid asset balance transfer dto");
        let action = unwrap_regular_action(&transaction);
        assert_eq!(action.date(), datetime!(2000-03-23 00:00:00 UTC));

        let mut portfolio = Portfolio::new();
        let actions: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: account_from,
                quantity: dec!(2),
                price: dec!(10),
                fees: dec!(1),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            action,
        ];
        portfolio.process_transactions(actions);

        assert!(portfolio.account_portfolios().get(&account_from).is_none());
        let destination_positions = &portfolio
            .account_portfolios()
            .get(&account_to)
            .expect("destination account should exist")
            .asset_portfolios
            .get(&1)
            .expect("destination asset portfolio should exist")
            .positions;
        assert_eq!(destination_positions.len(), 1);
        assert_eq!(destination_positions[0].units(), dec!(2));
        assert_eq!(destination_positions[0].add_price(), dec!(10));
        assert_eq!(
            destination_positions[0].add_date(),
            datetime!(2000-03-22 00:00:00 UTC)
        );
        assert_eq!(destination_positions[0].total_fees(), dec!(2.5));
    }

    #[test]
    fn portfolio_action_quantity_comes_from_incoming_entry() {
        load_dynamic_enums();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();
        let dto = transfer_dto(account_from, account_to, dec!(-3), dec!(2), vec![]);
        let transaction = AssetBalanceTransferTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("valid asset balance transfer dto");
        let action = unwrap_regular_action(&transaction);

        let mut portfolio = Portfolio::new();
        let actions: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(AssetTransferIn {
                asset_id: 1,
                account_id: account_from,
                quantity: dec!(5),
                price: dec!(10),
                fees: dec!(0),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            action,
        ];
        portfolio.process_transactions(actions);

        let source_units = portfolio
            .account_portfolios()
            .get(&account_from)
            .expect("source account should exist")
            .asset_portfolios
            .get(&1)
            .expect("source asset portfolio should exist")
            .units();
        let destination_units = portfolio
            .account_portfolios()
            .get(&account_to)
            .expect("destination account should exist")
            .asset_portfolios
            .get(&1)
            .expect("destination asset portfolio should exist")
            .units();

        assert_eq!(source_units, dec!(3));
        assert_eq!(destination_units, dec!(2));
    }

    #[test]
    fn try_into_dto_identifies_legs_by_sign_and_collects_fees() {
        load_dynamic_enums();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();
        let fee_entries = vec![FeeEntryDto {
            entry: EntryDto::new(1, account_from, dec!(-1)),
            entry_type: FeeEntryTypesDto::Transaction,
        }];
        let dto = transfer_dto(account_from, account_to, dec!(-2), dec!(2), fee_entries);
        let transaction = AssetBalanceTransferTransaction::try_from_dto(dto, Uuid::new_v4())
            .expect("valid asset balance transfer dto");

        let round_tripped = transaction.try_into_dto().expect("should build dto");

        let metadata = match round_tripped.transaction_type {
            TransactionTypeDto::AssetBalanceTransfer(metadata) => metadata,
            _ => panic!("Expected asset balance transfer metadata"),
        };
        assert_eq!(metadata.outgoing_change.quantity, dec!(-2));
        assert_eq!(metadata.outgoing_change.account_id, account_from);
        assert_eq!(metadata.incoming_change.quantity, dec!(2));
        assert_eq!(metadata.incoming_change.account_id, account_to);
        assert_eq!(round_tripped.date, datetime!(2000-03-23 00:00:00 UTC));
        assert_eq!(round_tripped.fee_entries.len(), 1);
        assert_eq!(
            round_tripped.fee_entries[0].entry_type,
            FeeEntryTypesDto::Transaction
        );
        assert_eq!(round_tripped.fee_entries[0].entry.quantity, dec!(-1));
    }
}
