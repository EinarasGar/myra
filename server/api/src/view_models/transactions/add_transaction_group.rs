use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{
    metadata_lookup::MetadataLookupTables,
    transaction_group::{
        MandatoryIdentifiableTransactionGroupViewModel, TransactionGroupViewModel,
    },
};


#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddTransactionGroupRequestViewModel {
    #[serde(flatten)]
    pub group: TransactionGroupViewModel,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddTransactionGroupResponseViewModel {
    /// The id of the newly created transaction group
    pub group: MandatoryIdentifiableTransactionGroupViewModel,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
