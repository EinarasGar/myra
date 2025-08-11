use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};
use utoipa::ToSchema;

use crate::view_models::transactions::base_models::category_id::RequiredCategoryId;
use crate::view_models::transactions::{
    base_models::transaction_group_id::TransactionGroupId,
    transaction_types::{
        IdentifiableTransactionWithIdentifiableEntries,
        RequiredIdentifiableTransactionWithIdentifiableEntries, TransactionWithEntries,
    },
};

pub type TransactionGroupViewModel = TransactionGroup<TransactionWithEntries>;
pub type TransactionGroupWithIdentifiableChildrenViewModel =
    TransactionGroup<IdentifiableTransactionWithIdentifiableEntries>;
pub type RequiredTransactionGroupViewModel =
    TransactionGroup<RequiredIdentifiableTransactionWithIdentifiableEntries>;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct TransactionGroup<T> {
    /// All subtractions grouped into this group
    #[schema(inline = false)]
    pub transactions: Vec<T>,

    /// Overall description of whole group
    pub description: String,

    /// Overall category of whole group
    pub category_id: RequiredCategoryId,

    /// Unrelated to individual transactions date which represent when the collection of transactions occurred
    #[serde(with = "timestamp")]
    #[schema(value_type = i32)]
    pub date: OffsetDateTime,
}

pub type RequiredIdentifiableTransactionGroupViewModel =
    IdentifiableTransactionGroup<TransactionGroupId, RequiredTransactionGroupViewModel>;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IdentifiableTransactionGroup<I, G> {
    /// Id representing a single entry in a transaction.
    #[schema(inline = false)]
    pub group_id: I,

    #[serde(flatten)]
    pub group: G,
}
