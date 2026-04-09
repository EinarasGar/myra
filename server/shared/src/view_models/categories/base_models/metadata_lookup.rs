use serde::{Deserialize, Serialize};

use super::category_type::IdentifiableCategoryTypeViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, Default, utoipa::ToSchema)]
pub struct CategoryMetadataLookupTables {
    pub category_types: Vec<IdentifiableCategoryTypeViewModel>,
}
