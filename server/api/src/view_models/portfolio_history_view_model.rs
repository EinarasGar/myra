use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::assets::base_models::rate::AssetRateViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PortfolioHistoryViewModel {
    pub sums: Vec<AssetRateViewModel>,
}
