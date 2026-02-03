use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{CashDividendMetadataDto, TransactionDto, TransactionTypeDto},
};
use macros::type_tag;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::assets::base_models::asset_id::RequiredAssetId;
use crate::view_models::transactions::base_models::{
    account_asset_entry::{
        AccountAssetEntryViewModel, IdentifiableAccountAssetEntryViewModel,
        RequiredIdentifiableAccountAssetEntryViewModel,
    },
    transaction_base::{
        IdentifiableTransactionBaseWithIdentifiableEntries,
        RequiredIdentifiableTransactionBaseWithIdentifiableEntries, TransactionBaseWithEntries,
        TransactionBaseWithIdentifiableEntries,
    },
};

pub type CashDividendViewModel =
    CashDividend<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type CashDividendWithIdentifiableEntriesViewModel =
    CashDividend<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredCashDividendWithIdentifiableEntriesViewModel = CashDividend<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableCashDividendWithIdentifiableEntriesViewModel = CashDividend<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableCashDividendWithIdentifiableEntriesViewModel = CashDividend<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "cash_dividend")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CashDividend<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,

    /// An id of a cash asset for which the dividends were paid for.
    pub origin_asset_id: RequiredAssetId,
}

impl From<CashDividendViewModel> for TransactionDto {
    fn from(value: CashDividendViewModel) -> Self {
        TransactionDto {
            transaction_id: None,
            date: value.base.date,
            fee_entries: match value.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => [].into(),
            },
            transaction_type: TransactionTypeDto::CashDividend(CashDividendMetadataDto {
                entry: value.entry.into(),
                origin_asset_id: value.origin_asset_id.0,
            }),
        }
    }
}

impl<B, E> From<TransactionDto> for CashDividend<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::CashDividend(r) = value.clone().transaction_type {
            CashDividend {
                r#type: Default::default(),
                entry: r.entry.into(),
                origin_asset_id: RequiredAssetId(r.origin_asset_id),
                base: value.into(),
            }
        } else {
            panic!("Can not convert TransactionDto into CashDividend as the type is not CashDividend")
        }
    }
}
