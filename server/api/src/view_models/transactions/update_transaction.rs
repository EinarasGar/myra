use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    base_models::metadata_lookup::MetadataLookupTables,
    transaction_types::{
        MandatoryTransactionWithIdentifiableEntries, TransactionWithIdentifiableEntries,
    },
};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateTransactionRequestViewModel {
    pub transaction: TransactionWithIdentifiableEntries,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateTransactionResponseViewModel {
    pub transaction: MandatoryTransactionWithIdentifiableEntries,

    #[serde(flatten)]
    pub metadata: MetadataLookupTables,
}
