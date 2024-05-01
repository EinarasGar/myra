use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    base_models::metadata_lookup::MetadataLookupTables,
    transaction_types::{
        MandatoryTransactionWithIdentifiableEntries, TransactionWithIdentifiableEntries,
    },
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateIndividualTransactionRequestViewModel {
    pub transaction: TransactionWithIdentifiableEntries,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateIndividualTransactionResponseViewModel {
    pub transaction: MandatoryTransactionWithIdentifiableEntries,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
