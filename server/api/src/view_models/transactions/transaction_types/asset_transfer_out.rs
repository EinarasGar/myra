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

pub type AssetTransferOutViewModel =
    AssetTransferOut<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type AssetTransferOutWithIdentifiableEntriesViewModel = AssetTransferOut<
    TransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredAssetTransferOutWithIdentifiableEntriesViewModel = AssetTransferOut<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAssetTransferOutWithIdentifiableEntriesViewModel = AssetTransferOut<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAssetTransferOutWithIdentifiableEntriesViewModel = AssetTransferOut<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "asset_transfer_out")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetTransferOut<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,
}

impl From<AssetTransferOutViewModel> for TransactionDto {
    fn from(_trans: AssetTransferOutViewModel) -> Self {
        todo!()
    }
}
