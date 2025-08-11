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

pub type AssetBalanceTransferViewModel =
    AssetBalanceTransfer<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type AssetBalanceTransferWithIdentifiableEntriesViewModel = AssetBalanceTransfer<
    TransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredAssetBalanceTransferWithIdentifiableEntriesViewModel = AssetBalanceTransfer<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAssetBalanceTransferWithIdentifiableEntriesViewModel = AssetBalanceTransfer<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAssetBalanceTransferWithIdentifiableEntriesViewModel =
    AssetBalanceTransfer<
        RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
        RequiredIdentifiableAccountAssetEntryViewModel,
    >;

#[type_tag(value = "asset_balance_transfer")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetBalanceTransfer<B, E> {
    #[serde(flatten)]
    pub base: B,

    pub outgoing_change: E,

    pub incoming_change: E,
}

impl From<AssetBalanceTransferViewModel> for TransactionDto {
    fn from(_trans: AssetBalanceTransferViewModel) -> Self {
        todo!()
    }
}
