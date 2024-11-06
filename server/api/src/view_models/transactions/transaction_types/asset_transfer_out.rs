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
    AssetTransferOutViewModel = AssetTransferOut<TransactionBaseWithEntries, AccountAssetEntryViewModel>,
    AssetTransferOutWithIdentifiableEntriesViewModel = AssetTransferOut<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryAssetTransferOutWithIdentifiableEntriesViewModel = AssetTransferOut<TransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
    IdentifiableAssetTransferOutWithIdentifiableEntriesViewModel = AssetTransferOut<IdentifiableTransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableAssetTransferOutWithIdentifiableEntriesViewModel = AssetTransferOut<MandatoryIdentifiableTransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
)]
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
