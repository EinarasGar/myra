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
    AccountFeesViewModel = AccountFees<TransactionBaseWithEntries, AccountAssetEntryViewModel>,
    AccountFeesWithIdentifiableEntriesViewModel = AccountFees<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryAccountFeesWithIdentifiableEntriesViewModel = AccountFees<TransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
    IdentifiableAccountFeesWithIdentifiableEntriesViewModel = AccountFees<IdentifiableTransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableAccountFeesWithIdentifiableEntriesViewModel = AccountFees<MandatoryIdentifiableTransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
)]
pub struct AccountFees<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,
}

impl From<AccountFeesViewModel> for TransactionDto {
    fn from(trans: AccountFeesViewModel) -> Self {
        todo!()
    }
}
