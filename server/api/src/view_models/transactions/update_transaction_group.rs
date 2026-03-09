use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{
    metadata_lookup::MetadataLookupTables,
    transaction_group::{RequiredTransactionGroup, TransactionGroupWithEntryIds},
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateTransactionGroupRequestViewModel {
    #[serde(flatten)]
    pub group: TransactionGroupWithEntryIds,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateTransactionGroupResponseViewModel {
    pub group: RequiredTransactionGroup,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
