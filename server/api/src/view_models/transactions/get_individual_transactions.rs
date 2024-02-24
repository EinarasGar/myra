use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    base_models::metadata_lookup::MetadataLookupTables,
    transaction_types::MandatoryIdentifiableTransactionWithIdentifiableEntries,
};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetIndividualTransactionsViewModel {
    pub transactions: Vec<MandatoryIdentifiableTransactionWithIdentifiableEntries>,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
