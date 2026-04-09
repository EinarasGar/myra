use serde::{Deserialize, Serialize};

use super::transaction_types::{
    RequiredIdentifiableTransactionWithIdentifiableEntries, TransactionWithEntries,
};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AddIndividualTransactionRequestViewModel {
    /// Individual transaction to be added
    pub transaction: TransactionWithEntries,
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AddIndividualTransactionResponseViewModel {
    pub transaction: RequiredIdentifiableTransactionWithIdentifiableEntries,
}
