use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

use super::{
    asset_dto::AssetDto, asset_rate_dto::AssetRateDto, portfolio_account_dto::PortfolioAccountDto,
};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioRowDto {
    pub asset: AssetDto,
    pub base_asset: Option<AssetDto>,
    pub account: PortfolioAccountDto,
    pub sum: Decimal,
    pub last_rate: Option<AssetRateDto>,
    pub last_reference_rate: Option<AssetRateDto>,
}
