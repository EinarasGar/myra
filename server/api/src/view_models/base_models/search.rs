use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use crate::view_models::{
    assets::{base_models::lookup::AssetLookupTables, get_assets::GetAssetsLineResponseViewModel},
    transactions::{
        base_models::metadata_lookup::MetadataLookupTables,
        transaction_types::MandatoryIdentifiableTransactionWithIdentifiableEntries,
    },
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    PageOfAssetsResultsWithLookupViewModel = PageOfResults<GetAssetsLineResponseViewModel, AssetLookupTables>,
    PageOfIndividualTransactionsWithLookupViewModel = PageOfResults<MandatoryIdentifiableTransactionWithIdentifiableEntries, MetadataLookupTables>
)]
pub struct PageOfResults<T, L> {
    /// One page of results
    pub results: Vec<T>,

    /// The total number of results available
    #[schema(example = 2203)]
    pub total_results: i32,

    pub lookup_tables: L,
}

#[derive(Clone, Debug, Serialize, Deserialize, IntoParams)]
#[serde(default)]
pub struct PaginatedSearchQuery {
    #[param(maximum = 100, minimum = 1, example = 10)]
    /// How many items to return in a single page
    pub count: u64,

    /// The index in the list of the fist element of the page.
    #[param(minimum = 0, example = 30)]
    pub start: u64,

    /// The search query
    pub query: Option<String>,
}

impl Default for PaginatedSearchQuery {
    fn default() -> Self {
        Self {
            count: 10,
            start: 0,
            query: None,
        }
    }
}
