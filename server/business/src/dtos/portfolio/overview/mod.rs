use asset_overview_dto::PortfolioAssetOverviewDto;
use cash_overview_dto::PortfolioCashOverviewDto;

pub mod asset_overview_dto;
pub mod asset_position_overview_dto;
pub mod cash_overview_dto;

#[derive(Debug)]
pub enum PortfolioOverviewType {
    Asset(PortfolioAssetOverviewDto),
    Cash(PortfolioCashOverviewDto),
}

#[derive(Debug)]
pub struct PortfolioOverviewDto {
    pub portfolios: Vec<PortfolioOverviewType>,
}
