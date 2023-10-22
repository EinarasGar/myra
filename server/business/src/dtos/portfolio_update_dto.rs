use dal::models::portfolio_models::PortfolioUpdateModel;
use rust_decimal::Decimal;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct PortfolioUpdateDto {
    pub user_id: Uuid,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub sum: Decimal,
}

impl From<PortfolioUpdateModel> for PortfolioUpdateDto {
    fn from(model: PortfolioUpdateModel) -> Self {
        PortfolioUpdateDto {
            user_id: model.user_id,
            asset_id: model.asset_id,
            account_id: model.account_id,
            sum: model.sum,
        }
    }
}

impl From<PortfolioUpdateDto> for PortfolioUpdateModel {
    fn from(dto: PortfolioUpdateDto) -> Self {
        PortfolioUpdateModel {
            user_id: dto.user_id,
            asset_id: dto.asset_id,
            account_id: dto.account_id,
            sum: dto.sum,
        }
    }
}
