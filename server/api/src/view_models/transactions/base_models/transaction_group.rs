use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};
use utoipa::ToSchema;

use crate::view_models::transactions::transaction_types::{
    IdentifiableTransactionWithIdentifiableEntries,
    MandatoryIdentifiableTransactionWithIdentifiableEntries, TransactionWithEntries,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    TransactionGroupViewModel = TransactionGroup<TransactionWithEntries>,
    TransactionGroupWithIdentifiableChildrenViewModel = TransactionGroup<IdentifiableTransactionWithIdentifiableEntries>,
    MandatoryTransactionGroupViewModel = TransactionGroup<MandatoryIdentifiableTransactionWithIdentifiableEntries>
)]
pub struct TransactionGroup<T> {
    /// All subtractions grouped into this group
    pub transactions: Vec<T>,

    /// Overall description of whole group
    pub description: String,

    /// Overall category of whole group
    pub category_id: i32,

    /// Unrelated to individual transactions date which represent when the collection of transactions occurred
    #[serde(with = "iso8601")]
    pub date: OffsetDateTime,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    MandatoryIdentifiableTransactionGroupViewModel = IdentifiableTransactionGroup<i32, MandatoryTransactionGroupViewModel>
)]
pub struct IdentifiableTransactionGroup<I, G> {
    /// Id representing a single entry in a transaction.
    pub group_id: I,

    #[serde(flatten)]
    pub group: G,
}
