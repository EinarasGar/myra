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
    AssetSaleViewModel = AssetSale<TransactionBaseWithEntries, AccountAssetEntryViewModel>,
    AssetSaleWithIdentifiableEntriesViewModel = AssetSale<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryAssetSaleWithIdentifiableEntriesViewModel = AssetSale<TransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
    IdentifiableAssetSaleWithIdentifiableEntriesViewModel = AssetSale<IdentifiableTransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableAssetSaleWithIdentifiableEntriesViewModel = AssetSale<MandatoryIdentifiableTransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
)]
pub struct AssetSale<B, E> {
    #[serde(flatten)]
    pub base: B,

    pub sale_entry: E,

    pub proceeds_entry: E,
}
