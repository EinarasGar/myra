use business::dtos::{fee_entry_dto::FeeEntryDto, transaction_dto::TransactionDto};
use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};
use utoipa::ToSchema;
use uuid::Uuid;

use super::transaction_fee::{
    IdentifiableTransactionFeeViewModel, MandatoryIdentifiableTransactionFeeViewModel,
    TransactionFeeViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    TransactionBaseWithEntries = TransactionBase<TransactionFeeViewModel>,
    TransactionBaseWithIdentifiableEntries = TransactionBase<IdentifiableTransactionFeeViewModel>,
    MandatoryTransactionBaseWithIdentifiableEntries = TransactionBase<MandatoryIdentifiableTransactionFeeViewModel>
)]
pub struct TransactionBase<F> {
    /// Date when the transaction occured.
    #[serde(with = "timestamp")]
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

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    IdentifiableTransactionBaseWithIdentifiableEntries = IdentifiableTransactionBase<TransactionBaseWithIdentifiableEntries, Option<Uuid>>,
    MandatoryIdentifiableTransactionBaseWithIdentifiableEntries = IdentifiableTransactionBase<MandatoryTransactionBaseWithIdentifiableEntries, Uuid>
)]
pub struct IdentifiableTransactionBase<B, I> {
    /// Id representing the full transaction.
    pub transaction_id: I,

    /// Date when the transaction occured.
    #[serde(flatten)]
    pub base: B,
}

impl From<TransactionDto> for MandatoryIdentifiableTransactionBaseWithIdentifiableEntries {
    fn from(value: TransactionDto) -> Self {
        Self {
            transaction_id: value
                .transaction_id
                .expect("Transaction Id mut not be None"),
            base: value.into(),
        }
    }
}

impl From<TransactionDto> for IdentifiableTransactionBaseWithIdentifiableEntries {
    fn from(value: TransactionDto) -> Self {
        Self {
            transaction_id: value.transaction_id,
            base: value.into(),
        }
    }
}
