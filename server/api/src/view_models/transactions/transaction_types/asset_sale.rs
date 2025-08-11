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

pub type AssetSaleViewModel = AssetSale<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type AssetSaleWithIdentifiableEntriesViewModel =
    AssetSale<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredAssetSaleWithIdentifiableEntriesViewModel = AssetSale<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAssetSaleWithIdentifiableEntriesViewModel = AssetSale<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAssetSaleWithIdentifiableEntriesViewModel = AssetSale<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "asset_sale")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetSale<B, E> {
    #[serde(flatten)]
    pub base: B,

    pub sale_entry: E,

    pub proceeds_entry: E,
}

impl From<AssetSaleViewModel> for TransactionDto {
    fn from(_trans: AssetSaleViewModel) -> Self {
        todo!()
    }
}
