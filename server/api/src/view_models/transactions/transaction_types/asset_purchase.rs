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
    AssetPurchaseViewModel = AssetPurchase<TransactionBaseWithEntries, AccountAssetEntryViewModel>,
    AssetPurchaseWithIdentifiableEntriesViewModel = AssetPurchase<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryAssetPurchaseWithIdentifiableEntriesViewModel = AssetPurchase<TransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
    IdentifiableAssetPurchaseWithIdentifiableEntriesViewModel = AssetPurchase<IdentifiableTransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableAssetPurchaseWithIdentifiableEntriesViewModel = AssetPurchase<MandatoryIdentifiableTransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
)]
pub struct AssetPurchase<B, E> {
    #[serde(flatten)]
    pub base: B,

    pub purchase_change: E,

    pub cash_outgoings_change: E,
}
