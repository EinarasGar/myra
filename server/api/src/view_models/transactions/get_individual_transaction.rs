use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    base_models::metadata_lookup::MetadataLookupTables,
    transaction_types::{
        MandatoryIdentifiableTransactionWithIdentifiableEntries,
        MandatoryTransactionWithIdentifiableEntries,
    },
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetIndividualTransactionViewModel {
    pub transaction: MandatoryTransactionWithIdentifiableEntries,

    pub lookup_tables: MetadataLookupTables,
}
