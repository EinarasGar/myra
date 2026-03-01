use business::dtos::transaction_dto::TransactionDto;
use macros::type_tag;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::transactions::base_models::{
    account_asset_entry::{
        IdentifiableAccountAssetEntryViewModel, PositiveAccountAssetEntry,
        RequiredIdentifiableAccountAssetEntryViewModel,
    },
    transaction_base::{
        IdentifiableTransactionBaseWithIdentifiableEntries,
        RequiredIdentifiableTransactionBaseWithIdentifiableEntries, TransactionBaseWithEntries,
        TransactionBaseWithIdentifiableEntries,
    },
};

#[allow(dead_code)]
pub type AssetTransferInViewModel =
    AssetTransferIn<TransactionBaseWithEntries, PositiveAccountAssetEntry>;
#[allow(dead_code)]
pub type AssetTransferInWithIdentifiableEntriesViewModel =
    AssetTransferIn<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredAssetTransferInWithIdentifiableEntriesViewModel = AssetTransferIn<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAssetTransferInWithIdentifiableEntriesViewModel = AssetTransferIn<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAssetTransferInWithIdentifiableEntriesViewModel = AssetTransferIn<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "asset_transfer_in")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetTransferIn<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,
}

impl<E> From<AssetTransferIn<TransactionBaseWithEntries, E>> for TransactionDto {
    fn from(_trans: AssetTransferIn<TransactionBaseWithEntries, E>) -> Self {
        todo!()
    }
}
