use business::dtos::{fee_entry_dto::FeeEntryDto, transaction_dto::TransactionDto};
use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};
use utoipa::ToSchema;

use crate::view_models::transactions::base_models::transaction_id::{
    RequiredTransactionId, TransactionId,
};

use super::transaction_fee::{
    IdentifiableTransactionFeeViewModel, RequiredIdentifiableTransactionFeeViewModel,
    TransactionFeeViewModel,
};

pub type TransactionBaseWithEntries = TransactionBase<TransactionFeeViewModel>;
pub type TransactionBaseWithIdentifiableEntries =
    TransactionBase<IdentifiableTransactionFeeViewModel>;
pub type RequiredTransactionBaseWithIdentifiableEntries =
    TransactionBase<RequiredIdentifiableTransactionFeeViewModel>;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct TransactionBase<F> {
    /// Date when the transaction occured.
    #[serde(with = "timestamp")]
    #[schema(value_type = i32)]
    pub date: OffsetDateTime,

    /// Any other fees related to the transaction, such as transfer or conversion fees.
    pub fees: Option<Vec<F>>,
}

impl<F> From<TransactionDto> for TransactionBase<F>
where
    F: From<FeeEntryDto>,
{
    fn from(value: TransactionDto) -> Self {
        Self {
            date: value.date,
            fees: if !value.fee_entries.is_empty() {
                Some(value.fee_entries.into_iter().map(|x| x.into()).collect())
            } else {
                None
            },
        }
    }
}

pub type IdentifiableTransactionBaseWithIdentifiableEntries =
    IdentifiableTransactionBase<TransactionBaseWithIdentifiableEntries, TransactionId>;
pub type RequiredIdentifiableTransactionBaseWithIdentifiableEntries = IdentifiableTransactionBase<
    RequiredTransactionBaseWithIdentifiableEntries,
    RequiredTransactionId,
>;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IdentifiableTransactionBase<B, I> {
    /// Id representing the full transaction.
    #[schema(inline = false)]
    pub transaction_id: I,

    /// Date when the transaction occured.
    #[serde(flatten)]
    pub base: B,
}

impl From<TransactionDto> for RequiredIdentifiableTransactionBaseWithIdentifiableEntries {
    fn from(value: TransactionDto) -> Self {
        Self {
            transaction_id: RequiredTransactionId(
                value
                    .transaction_id
                    .expect("Transaction Id mut not be None"),
            ),
            base: value.into(),
        }
    }
}

impl From<TransactionDto> for IdentifiableTransactionBaseWithIdentifiableEntries {
    fn from(value: TransactionDto) -> Self {
        Self {
            transaction_id: TransactionId(value.transaction_id),
            base: value.into(),
        }
    }
}
