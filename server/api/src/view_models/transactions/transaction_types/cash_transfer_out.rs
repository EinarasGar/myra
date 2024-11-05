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
    CashTransferOutViewModel = CashTransferOut<TransactionBaseWithEntries, AccountAssetEntryViewModel>,
    CashTransferOutWithIdentifiableEntriesViewModel = CashTransferOut<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryCashTransferOutWithIdentifiableEntriesViewModel = CashTransferOut<TransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
    IdentifiableCashTransferOutWithIdentifiableEntriesViewModel = CashTransferOut<IdentifiableTransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableCashTransferOutWithIdentifiableEntriesViewModel = CashTransferOut<MandatoryIdentifiableTransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
)]
pub struct CashTransferOut<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,
}

impl From<CashTransferOutViewModel> for TransactionDto {
    fn from(trans: CashTransferOutViewModel) -> Self {
        todo!()
    }
}
