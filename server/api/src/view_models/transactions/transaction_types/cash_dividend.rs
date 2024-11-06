use business::dtos::transaction_dto::TransactionDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::transactions::base_models::{
    account_asset_entry::{
        AccountAssetEntryViewModel, IdentifiableAccountAssetEntryViewModel,
        MandatoryIdentifiableAccountAssetEntryViewModel,
    },
    transaction_base::{
        IdentifiableTransactionBaseWithIdentifiableEntries,
        MandatoryIdentifiableTransactionBaseWithIdentifiableEntries, TransactionBaseWithEntries,
        TransactionBaseWithIdentifiableEntries,
    },
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    CashDividendViewModel = CashDividend<TransactionBaseWithEntries, AccountAssetEntryViewModel>,
    CashDividendWithIdentifiableEntriesViewModel = CashDividend<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryCashDividendWithIdentifiableEntriesViewModel = CashDividend<TransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
    IdentifiableCashDividendWithIdentifiableEntriesViewModel = CashDividend<IdentifiableTransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableCashDividendWithIdentifiableEntriesViewModel = CashDividend<MandatoryIdentifiableTransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
)]
pub struct CashDividend<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,

    /// An id of a cash asset for which the dividends were paid for.
    pub origin_asset_id: i32,
}

impl From<CashDividendViewModel> for TransactionDto {
    fn from(_trans: CashDividendViewModel) -> Self {
        todo!()
    }
}
