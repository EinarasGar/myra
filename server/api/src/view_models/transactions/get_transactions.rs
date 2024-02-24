use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    base_models::{
        metadata_lookup::MetadataLookupTables,
        transaction_group::MandatoryIdentifiableTransactionGroupViewModel,
    },
    transaction_types::MandatoryIdentifiableTransactionWithIdentifiableEntries,
};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetTransactionsViewModel {
    pub individual_transactions: Vec<MandatoryIdentifiableTransactionWithIdentifiableEntries>,
    pub transaction_groups: Vec<MandatoryIdentifiableTransactionGroupViewModel>,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
