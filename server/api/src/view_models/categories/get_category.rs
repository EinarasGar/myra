use super::base_models::category::ExpandedCategoryViewModel;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetCategoryResponseViewModel {
    #[serde(flatten)]
    pub category: ExpandedCategoryViewModel,
}
