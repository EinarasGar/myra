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
    AssetBalanceTransferViewModel = AssetBalanceTransfer<TransactionBaseWithEntries, AccountAssetEntryViewModel>,
    AssetBalanceTransferWithIdentifiableEntriesViewModel = AssetBalanceTransfer<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryAssetBalanceTransferWithIdentifiableEntriesViewModel = AssetBalanceTransfer<TransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
    IdentifiableAssetBalanceTransferWithIdentifiableEntriesViewModel = AssetBalanceTransfer<IdentifiableTransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableAssetBalanceTransferWithIdentifiableEntriesViewModel = AssetBalanceTransfer<MandatoryIdentifiableTransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
)]
pub struct AssetBalanceTransfer<B, E> {
    #[serde(flatten)]
    pub base: B,

    pub outgoing_change: E,

    pub incoming_change: E,
}

impl From<AssetBalanceTransferViewModel> for TransactionDto {
    fn from(trans: AssetBalanceTransferViewModel) -> Self {
        todo!()
    }
}
