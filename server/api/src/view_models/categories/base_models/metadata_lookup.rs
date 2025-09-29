use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::category_type::IdentifiableCategoryTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, Default)]
pub struct CategoryMetadataLookupTables {
    pub category_types: Vec<IdentifiableCategoryTypeViewModel>,
}
