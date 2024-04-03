use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};
use utoipa::ToSchema;
use uuid::Uuid;

use super::transaction_fee::{IdentifiableTransactionFeeViewModel, MandatoryIdentifiableTransactionFeeViewModel, TransactionFeeViewModel};

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
    pub fees: Option<Vec<F>>
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    IdentifiableTransactionBaseWithIdentifiableEntries = IdentifiableTransactionBase<TransactionBaseWithIdentifiableEntries, Option<Uuid>>,
    MandatoryIdentifiableTransactionBaseWithIdentifiableEntries = IdentifiableTransactionBase<MandatoryTransactionBaseWithIdentifiableEntries, Uuid>
)]
pub struct IdentifiableTransactionBase<B,I> {
    /// Id representing the full transaction.
    pub transaction_id: I,

    /// Date when the transaction occured.
    #[serde(flatten)]
    pub fee: B,
}