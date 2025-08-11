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

pub type AssetTradeViewModel = AssetTrade<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type AssetTradeWithIdentifiableEntriesViewModel =
    AssetTrade<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredAssetTradeWithIdentifiableEntriesViewModel = AssetTrade<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAssetTradeWithIdentifiableEntriesViewModel = AssetTrade<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAssetTradeWithIdentifiableEntriesViewModel = AssetTrade<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "asset_trade")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetTrade<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How many units of asset are removed as part of the trade.
    pub outgoing_entry: E,

    /// How many units of asset are added as part of the trade.
    pub incoming_entry: E,
}

impl From<AssetTradeViewModel> for TransactionDto {
    fn from(_trans: AssetTradeViewModel) -> Self {
        todo!()
    }
}
