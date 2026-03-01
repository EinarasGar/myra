use business::dtos::transaction_dto::TransactionDto;
use macros::type_tag;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::transactions::base_models::{
    account_asset_entry::{
        IdentifiableAccountAssetEntryViewModel, NegativeAccountAssetEntry,
        RequiredIdentifiableAccountAssetEntryViewModel,
    },
    transaction_base::{
        IdentifiableTransactionBaseWithIdentifiableEntries,
        RequiredIdentifiableTransactionBaseWithIdentifiableEntries, TransactionBaseWithEntries,
        TransactionBaseWithIdentifiableEntries,
    },
};

#[allow(dead_code)]
pub type AccountFeesViewModel = AccountFees<TransactionBaseWithEntries, NegativeAccountAssetEntry>;
#[allow(dead_code)]
pub type AccountFeesWithIdentifiableEntriesViewModel =
    AccountFees<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredAccountFeesWithIdentifiableEntriesViewModel = AccountFees<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAccountFeesWithIdentifiableEntriesViewModel = AccountFees<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAccountFeesWithIdentifiableEntriesViewModel = AccountFees<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "account_fees")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AccountFees<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,
}

impl<E> From<AccountFees<TransactionBaseWithEntries, E>> for TransactionDto {
    fn from(_trans: AccountFees<TransactionBaseWithEntries, E>) -> Self {
        todo!()
    }
}
