use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{
    metadata_lookup::MetadataLookupTables,
    transaction_group::{TransactionGroupInput, TransactionGroupWithId},
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddTransactionGroupRequestViewModel {
    #[serde(flatten)]
    pub group: TransactionGroupInput,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AddTransactionGroupResponseViewModel {
    pub group: TransactionGroupWithId,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
