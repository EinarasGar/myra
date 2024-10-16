use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::transaction_types::{
    MandatoryIdentifiableTransactionWithIdentifiableEntries, TransactionWithEntries,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddIndividualTransactionRequestViewModel {
    /// Individual transaction to be added
    pub transaction: TransactionWithEntries,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddIndividualTransactionResponseViewModel {
    pub transaction: MandatoryIdentifiableTransactionWithIdentifiableEntries,
}
