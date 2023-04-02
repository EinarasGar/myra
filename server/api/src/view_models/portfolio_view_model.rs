use business::dtos::portfolio_dto::PortfolioDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

use super::asset_view_model::AssetRespData;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioRespData {
    pub asset: AssetRespData,
    pub sum: Decimal,
}

impl From<PortfolioDto> for PortfolioRespData {
    fn from(p: PortfolioDto) -> Self {
        Self {
            asset: p.asset.into(),
            sum: p.sum,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AllPortfolioRespdata {
    pub assets: Vec<PortfolioRespData>,
}
