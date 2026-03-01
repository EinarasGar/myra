use business::dtos::transaction_dto::TransactionDto;
use macros::type_tag;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::transactions::base_models::{
    account_asset_entry::{
        IdentifiableAccountAssetEntryViewModel, NegativeAccountAssetEntry,
        RequiredIdentifiableAccountAssetEntryViewModel,
    },
    transaction_base::{
        IdentifiableTransactionBaseWithIdentifiableEntries,
        RequiredIdentifiableTransactionBaseWithIdentifiableEntries, TransactionBaseWithEntries,
        TransactionBaseWithIdentifiableEntries,
    },
};

#[allow(dead_code)]
pub type AssetTransferOutViewModel =
    AssetTransferOut<TransactionBaseWithEntries, NegativeAccountAssetEntry>;
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

impl<E> From<AssetTransferOut<TransactionBaseWithEntries, E>> for TransactionDto {
    fn from(_trans: AssetTransferOut<TransactionBaseWithEntries, E>) -> Self {
        todo!()
    }
}
