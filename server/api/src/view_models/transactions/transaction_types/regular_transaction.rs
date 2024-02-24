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
    RegularTransactionViewModel = RegularTransaction<TransactionBaseWithEntries, AccountAssetEntryViewModel>,
    RegularTransactionWithIdentifiableEntriesViewModel = RegularTransaction<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryRegularTransactionWithIdentifiableEntriesViewModel = RegularTransaction<TransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
    IdentifiableRegularTransactionWithIdentifiableEntriesViewModel = RegularTransaction<IdentifiableTransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableRegularTransactionWithIdentifiableEntriesViewModel = RegularTransaction<MandatoryIdentifiableTransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
)]
pub struct RegularTransaction<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// Entry related to a transaction.
    pub entry: E,

    /// Specific bespoke category id.
    pub category_id: i32,

    /// Description of the transaction.
    pub description: Option<String>,
}
