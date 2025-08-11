use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{
    metadata_lookup::MetadataLookupTables,
    transaction_group::{RequiredIdentifiableTransactionGroupViewModel, TransactionGroupViewModel},
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddTransactionGroupRequestViewModel {
    #[serde(flatten)]
    pub group: TransactionGroupViewModel,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddTransactionGroupResponseViewModel {
    pub group: RequiredIdentifiableTransactionGroupViewModel,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
