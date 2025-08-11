use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    base_models::metadata_lookup::MetadataLookupTables,
    transaction_types::RequiredTransactionWithIdentifiableEntries,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetIndividualTransactionViewModel {
    pub transaction: RequiredTransactionWithIdentifiableEntries,

    pub lookup_tables: MetadataLookupTables,
}
