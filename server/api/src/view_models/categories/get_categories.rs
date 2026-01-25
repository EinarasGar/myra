use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::categories::base_models::{
    category::IdentifiableCategoryViewModel, metadata_lookup::CategoryMetadataLookupTables,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetCategoriesResponseViewModel {
    pub categories: Vec<IdentifiableCategoryViewModel>,
    pub lookup_tables: CategoryMetadataLookupTables,
}
