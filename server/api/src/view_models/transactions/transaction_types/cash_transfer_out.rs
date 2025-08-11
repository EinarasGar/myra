use business::dtos::transaction_dto::TransactionDto;
use macros::type_tag;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

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

pub type CashTransferOutViewModel =
    CashTransferOut<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type CashTransferOutWithIdentifiableEntriesViewModel =
    CashTransferOut<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredCashTransferOutWithIdentifiableEntriesViewModel = CashTransferOut<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableCashTransferOutWithIdentifiableEntriesViewModel = CashTransferOut<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableCashTransferOutWithIdentifiableEntriesViewModel = CashTransferOut<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "cash_transfer_out")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CashTransferOut<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,
}

impl From<CashTransferOutViewModel> for TransactionDto {
    fn from(_trans: CashTransferOutViewModel) -> Self {
        todo!()
    }
}
