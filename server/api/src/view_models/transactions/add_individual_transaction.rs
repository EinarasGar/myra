use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    base_models::metadata_lookup::MetadataLookupTables,
    transaction_types::{
        MandatoryIdentifiableTransactionWithIdentifiableEntries, TransactionWithEntries,
    },
};


#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddIndividualTransactionRequestViewModel {
    /// Individual transaction to be added
    pub transaction: TransactionWithEntries,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddIndividualTransactionResponseViewModel {
    pub transaction: MandatoryIdentifiableTransactionWithIdentifiableEntries,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
