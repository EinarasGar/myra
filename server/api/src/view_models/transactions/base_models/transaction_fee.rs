use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::account_asset_entry::{AccountAssetEntryViewModel,  IdentifiableAccountAssetEntryViewModel, MandatoryIdentifiableAccountAssetEntryViewModel};


#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    TransactionFeeViewModel = TransactionFee<AccountAssetEntryViewModel>, 
    IdentifiableTransactionFeeViewModel = TransactionFee<IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableTransactionFeeViewModel = TransactionFee<MandatoryIdentifiableAccountAssetEntryViewModel>
)]
pub struct TransactionFee<E> {
    #[serde(flatten)]
    pub entry: E,

    /// The type of fee related to a transaction.
    pub fee_type: TransactionFeeType,
}


#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum TransactionFeeType {
    Transaction,
    Exchange,
}
