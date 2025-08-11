use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::transaction_types::{
    RequiredIdentifiableTransactionWithIdentifiableEntries, TransactionWithEntries,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddIndividualTransactionRequestViewModel {
    /// Individual transaction to be added
    pub transaction: TransactionWithEntries,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddIndividualTransactionResponseViewModel {
    pub transaction: RequiredIdentifiableTransactionWithIdentifiableEntries,
}
