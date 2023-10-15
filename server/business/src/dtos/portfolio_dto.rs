use serde::{Deserialize, Serialize};

use super::{asset_dto::AssetDto, portfolio_row_dto::PortfolioRowDto};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioDto {
    pub rows: Vec<PortfolioRowDto>,
    pub reference_asset: AssetDto,
}
