use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    IdentifiableAccountAssetEntryViewModel = IdentifiableAccountAssetEntry<Option<i32>>,
    MandatoryIdentifiableAccountAssetEntryViewModel = IdentifiableAccountAssetEntry<i32>
)]
pub struct IdentifiableAccountAssetEntry<I> {
    /// Id representing a single entry in a transaction.
    pub entry_id: I,

    #[serde(flatten)]
    pub entry: AccountAssetEntryViewModel,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AccountAssetEntryViewModel {
    /// The id of an account for which to the entry is related.
    pub account_id: Uuid,

    /// The id of an asset in the account for which the entry is related.
    pub asset_id: i32,

    /// The number of units of the asset that were added or removed from the account.
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount: Decimal,
}
