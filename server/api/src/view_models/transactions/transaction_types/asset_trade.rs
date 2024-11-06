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
    AssetTradeViewModel = AssetTrade<TransactionBaseWithEntries, AccountAssetEntryViewModel>,
    AssetTradeWithIdentifiableEntriesViewModel = AssetTrade<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryAssetTradeWithIdentifiableEntriesViewModel = AssetTrade<TransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
    IdentifiableAssetTradeWithIdentifiableEntriesViewModel = AssetTrade<IdentifiableTransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableAssetTradeWithIdentifiableEntriesViewModel = AssetTrade<MandatoryIdentifiableTransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
)]
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
