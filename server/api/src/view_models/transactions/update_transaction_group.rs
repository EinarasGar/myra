use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{
    metadata_lookup::MetadataLookupTables,
    transaction_group::{
        MandatoryTransactionGroupViewModel, TransactionGroupWithIdentifiableChildrenViewModel,
    },
};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateTransactionGroupRequestViewModel {
    #[serde(flatten)]
    pub group: TransactionGroupWithIdentifiableChildrenViewModel,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateTransactionGroupResponseViewModel {
    pub group: MandatoryTransactionGroupViewModel,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
