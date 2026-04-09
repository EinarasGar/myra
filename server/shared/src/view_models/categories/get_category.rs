use super::base_models::category::ExpandedCategoryViewModel;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct GetCategoryResponseViewModel {
    #[serde(flatten)]
    pub category: ExpandedCategoryViewModel,
}
