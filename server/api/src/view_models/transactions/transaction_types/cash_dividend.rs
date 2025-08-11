use business::dtos::transaction_dto::TransactionDto;
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
    fn from(_trans: CashDividendViewModel) -> Self {
        todo!()
    }
}
