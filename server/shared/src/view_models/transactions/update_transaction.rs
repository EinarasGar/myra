use serde::{Deserialize, Serialize};

use super::{
    base_models::metadata_lookup::MetadataLookupTables,
    transaction_types::{
        RequiredTransactionWithIdentifiableEntries, TransactionWithIdentifiableEntries,
    },
};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct UpdateTransactionRequestViewModel {
    pub transaction: TransactionWithIdentifiableEntries,
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct UpdateTransactionResponseViewModel {
    pub transaction: RequiredTransactionWithIdentifiableEntries,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
