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

pub type AssetTransferInViewModel =
    AssetTransferIn<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
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

impl From<AssetTransferInViewModel> for TransactionDto {
    fn from(_trans: AssetTransferInViewModel) -> Self {
        todo!()
    }
}
