use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};

use super::description::Description;
use crate::view_models::transactions::base_models::category_id::RequiredCategoryId;
use crate::view_models::transactions::{
    base_models::transaction_group_id::TransactionGroupId,
    transaction_types::{RequiredTransactionWithId, TransactionInput, TransactionWithId},
};

pub type TransactionGroupInput = TransactionGroup<TransactionInput>;
pub type TransactionGroupWithEntryIds = TransactionGroup<TransactionWithId>;
pub type RequiredTransactionGroup = TransactionGroup<RequiredTransactionWithId>;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct TransactionGroup<T> {
    /// All subtractions grouped into this group
    #[schema(inline = false)]
    pub transactions: Vec<T>,

    /// Overall description of whole group
    pub description: Description,

    /// Overall category of whole group
    pub category_id: RequiredCategoryId,

    /// Unrelated to individual transactions date which represent when the collection of transactions occurred
    #[serde(with = "timestamp")]
    #[schema(value_type = i32)]
    pub date: OffsetDateTime,
}

pub type TransactionGroupWithId =
    IdentifiableTransactionGroup<TransactionGroupId, RequiredTransactionGroup>;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct IdentifiableTransactionGroup<I, G> {
    /// Id representing a single entry in a transaction.
    #[schema(inline = false)]
    pub group_id: I,

    #[serde(flatten)]
    pub group: G,
}
