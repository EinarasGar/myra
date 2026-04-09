use serde::{Deserialize, Serialize};

use super::base_models::{
    metadata_lookup::MetadataLookupTables,
    transaction_group::{TransactionGroupInput, TransactionGroupWithId},
};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AddTransactionGroupRequestViewModel {
    #[serde(flatten)]
    pub group: TransactionGroupInput,
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AddTransactionGroupResponseViewModel {
    pub group: TransactionGroupWithId,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
