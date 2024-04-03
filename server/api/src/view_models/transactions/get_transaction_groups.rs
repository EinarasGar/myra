use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{
    metadata_lookup::MetadataLookupTables,
    transaction_group::MandatoryIdentifiableTransactionGroupViewModel,
};


#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetTransactionGroupsViewModel {
    pub groups: Vec<MandatoryIdentifiableTransactionGroupViewModel>,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
