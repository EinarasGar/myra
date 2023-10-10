use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::asset_rate_view_model::AssetRateViewModel;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PortfolioHistoryViewModel {
    pub sums: Vec<AssetRateViewModel>,
}
