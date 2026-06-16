use anyhow::Context;
use anyhow::Result;
use dal::{
    enums::transaction_types::DatabaseTransactionTypes,
    models::transaction_models::{AddTransactionModel, TransactionWithEntriesModel},
};
use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::dtos::fee_entry_dto::FeeEntryDto;
use crate::dtos::transaction_dto::TransactionDto;
use crate::dtos::transaction_dto::TransactionTypeDto;
use crate::entities::entries::entry::Entry;

pub struct BaseTransaction {
    user_id: Uuid,
    transaction_id: Option<Uuid>,
    date: OffsetDateTime,
    entries: Vec<Entry>,
}

impl BaseTransaction {
    pub fn new(
        user_id: Uuid,
        transaction_id: Option<Uuid>,
        date: OffsetDateTime,
        entries: Vec<Entry>,
    ) -> Self {
        Self {
            user_id,
            transaction_id,
            date,
            entries,
        }
    }

    pub fn from_models(models: Vec<TransactionWithEntriesModel>) -> Self {
        Self::new(
            models[0].user_id,
            Some(models[0].transaction_id),
            models[0].date_transacted,
            models
                .iter()
                .map(|x| Entry {
                    entry_id: Some(x.id),
                    asset_id: x.asset_id,
                    quantity: x.quantity,
                    account_id: x.account_id,
                    category: x.category_id,
                })
                .collect(),
        )
    }

    pub fn transaction_id(&self) -> Option<Uuid> {
        self.transaction_id
    }
    pub fn set_transaction_id(&mut self, transaction_id: Uuid) {
        self.transaction_id = Some(transaction_id);
    }

    pub fn entries(&self) -> &Vec<Entry> {
        &self.entries
    }

    pub fn entries_mut(&mut self) -> &mut Vec<Entry> {
        &mut self.entries
    }

    pub fn fee_entries_dtos(&self) -> Result<Vec<FeeEntryDto>> {
        self.entries
            .iter()
            .filter(|x| x.is_fee())
            .map(|x| FeeEntryDto::try_from(x.clone()))
            .collect::<Result<Vec<FeeEntryDto>>>()
    }

    pub fn try_into_dto(&self, metadata: TransactionTypeDto) -> Result<TransactionDto> {
        Ok(TransactionDto {
            transaction_id: self.transaction_id,
            date: self.date,
            transaction_type: metadata,
            fee_entries: self.fee_entries_dtos()?,
        })
    }

    pub fn get_add_transaction_model(
        &self,
        transaction_type: DatabaseTransactionTypes,
    ) -> AddTransactionModel {
        AddTransactionModel {
            user_id: self.user_id,
            group_id: None,
            date: self.date,
            transaction_type_id: transaction_type as i32,
        }
    }

    pub fn entry(&self, predicate: impl Fn(&&Entry) -> bool) -> Result<&Entry> {
        self.entries()
            .iter()
            .filter(|x| !x.is_fee())
            .find(predicate)
            .context("Could not find entry")
    }

    pub fn add_entries(&mut self, entries: Vec<Entry>) {
        self.entries_mut().extend(entries);
    }

    pub fn add_fee_entries_from_dtos(&mut self, fee_entries: Vec<FeeEntryDto>) -> Result<()> {
        self.entries_mut().append(
            &mut fee_entries
                .into_iter()
                .map(|x| -> Result<Entry> { x.try_into() })
                .collect::<Result<Vec<Entry>>>()?,
        );
        Ok(())
    }

    pub fn fee_entries_total(&self) -> Decimal {
        self.entries
            .iter()
            .filter(|x| x.is_fee())
            .map(|x| x.quantity)
            .sum()
    }

    pub fn date(&self) -> OffsetDateTime {
        self.date
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal_macros::dec;
    use time::macros::datetime;

    use crate::{
        dtos::{
            entry_dto::EntryDto, fee_entry_types_dto::FeeEntryTypesDto,
            transaction_dto::CashTransferInMetadataDto,
        },
        test_support::load_dynamic_enums,
    };

    use super::*;

    #[test]
    fn entry_predicate_skips_fee_entries() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let fee_entry = Entry::new(None, 1, dec!(-5), account_id, 2);
        let main_entry = Entry::new(None, 1, dec!(-5), account_id, 3);
        let base = BaseTransaction::new(
            Uuid::new_v4(),
            None,
            datetime!(2000-03-22 00:00:00 UTC),
            vec![fee_entry, main_entry],
        );

        let found = base
            .entry(|x| x.quantity < dec!(0))
            .expect("should find the non-fee entry");

        assert_eq!(found.category, 3);
        assert_eq!(found.quantity, dec!(-5));
    }

    #[test]
    fn entry_errors_when_only_fee_entries_match() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let fee_entry = Entry::new(None, 1, dec!(-5), account_id, 2);
        let base = BaseTransaction::new(
            Uuid::new_v4(),
            None,
            datetime!(2000-03-22 00:00:00 UTC),
            vec![fee_entry],
        );

        let result = base.entry(|x| x.quantity < dec!(0));

        assert!(result.is_err());
    }

    #[test]
    fn fee_entries_total_sums_negative_fee_quantities() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let entries = vec![
            Entry::new(None, 1, dec!(-1), account_id, 1),
            Entry::new(None, 1, dec!(-0.5), account_id, 8),
            Entry::new(None, 1, dec!(100), account_id, 3),
        ];
        let base = BaseTransaction::new(
            Uuid::new_v4(),
            None,
            datetime!(2000-03-22 00:00:00 UTC),
            entries,
        );

        assert_eq!(base.fee_entries_total(), dec!(-1.5));
    }

    #[test]
    fn fee_entries_total_is_zero_without_fee_entries() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let entries = vec![
            Entry::new(None, 1, dec!(-100), account_id, 3),
            Entry::new(None, 1, dec!(100), account_id, 3),
        ];
        let base = BaseTransaction::new(
            Uuid::new_v4(),
            None,
            datetime!(2000-03-22 00:00:00 UTC),
            entries,
        );

        assert_eq!(base.fee_entries_total(), dec!(0));
    }

    #[test]
    fn add_fee_entries_from_dtos_converts_and_stamps_fee_categories() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let mut base = BaseTransaction::new(
            Uuid::new_v4(),
            None,
            datetime!(2000-03-22 00:00:00 UTC),
            vec![],
        );

        base.add_fee_entries_from_dtos(vec![
            FeeEntryDto {
                entry: EntryDto::new(1, account_id, dec!(-1)),
                entry_type: FeeEntryTypesDto::Transaction,
            },
            FeeEntryDto {
                entry: EntryDto::new(1, account_id, dec!(-2)),
                entry_type: FeeEntryTypesDto::Exchange,
            },
            FeeEntryDto {
                entry: EntryDto::new(1, account_id, dec!(-3)),
                entry_type: FeeEntryTypesDto::WithholdingTax,
            },
        ])
        .expect("fee dtos should convert into entries");

        let entries = base.entries();
        assert_eq!(entries.len(), 3);
        assert_eq!(entries[0].category, 2);
        assert_eq!(entries[0].quantity, dec!(-1));
        assert_eq!(entries[1].category, 1);
        assert_eq!(entries[1].quantity, dec!(-2));
        assert_eq!(entries[2].category, 8);
        assert_eq!(entries[2].quantity, dec!(-3));
        assert!(entries.iter().all(|x| x.entry_id.is_none()));
        assert!(entries.iter().all(|x| x.account_id == account_id));
        assert!(entries.iter().all(|x| x.is_fee()));
    }

    #[test]
    fn from_models_maps_rows_to_entries_preserving_ids() {
        let transaction_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let account_one = Uuid::new_v4();
        let account_two = Uuid::new_v4();
        let date = datetime!(2001-06-15 00:00:00 UTC);

        let models = vec![
            TransactionWithEntriesModel {
                id: 7,
                asset_id: 1,
                account_id: account_one,
                quantity: dec!(-100),
                category_id: 15,
                transaction_id,
                user_id,
                type_id: DatabaseTransactionTypes::CashBalanceTransfer,
                date_transacted: date,
            },
            TransactionWithEntriesModel {
                id: 8,
                asset_id: 1,
                account_id: account_two,
                quantity: dec!(100),
                category_id: 15,
                transaction_id,
                user_id,
                type_id: DatabaseTransactionTypes::CashBalanceTransfer,
                date_transacted: date,
            },
        ];

        let base = BaseTransaction::from_models(models);

        assert_eq!(base.transaction_id(), Some(transaction_id));
        assert_eq!(base.date(), date);
        let entries = base.entries();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].entry_id, Some(7));
        assert_eq!(entries[0].asset_id, 1);
        assert_eq!(entries[0].quantity, dec!(-100));
        assert_eq!(entries[0].account_id, account_one);
        assert_eq!(entries[0].category, 15);
        assert_eq!(entries[1].entry_id, Some(8));
        assert_eq!(entries[1].quantity, dec!(100));
        assert_eq!(entries[1].account_id, account_two);
        assert_eq!(entries[1].category, 15);
    }

    #[test]
    fn try_into_dto_collects_fee_entries_into_fee_entries() {
        load_dynamic_enums();
        let account_id = Uuid::new_v4();
        let transaction_id = Uuid::new_v4();
        let date = datetime!(2000-03-22 00:00:00 UTC);
        let entries = vec![
            Entry::new(None, 1, dec!(100), account_id, 5),
            Entry::new(None, 1, dec!(-1), account_id, 2),
            Entry::new(None, 1, dec!(-0.25), account_id, 8),
        ];
        let base = BaseTransaction::new(Uuid::new_v4(), Some(transaction_id), date, entries);
        let metadata = TransactionTypeDto::CashTransferIn(CashTransferInMetadataDto {
            entry: EntryDto::new(1, account_id, dec!(100)),
        });

        let dto = base.try_into_dto(metadata).expect("should build dto");

        assert_eq!(dto.transaction_id, Some(transaction_id));
        assert_eq!(dto.date, date);
        assert_eq!(dto.fee_entries.len(), 2);
        assert_eq!(dto.fee_entries[0].entry_type, FeeEntryTypesDto::Transaction);
        assert_eq!(dto.fee_entries[0].entry.quantity, dec!(-1));
        assert_eq!(
            dto.fee_entries[1].entry_type,
            FeeEntryTypesDto::WithholdingTax
        );
        assert_eq!(dto.fee_entries[1].entry.quantity, dec!(-0.25));
    }
}
