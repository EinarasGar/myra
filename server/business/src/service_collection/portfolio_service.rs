use dal::db_sets::portfolio::PortfolioDbSet;
use uuid::Uuid;

use crate::models::portfolio::PortfolioDto;

#[derive(Clone)]
pub struct PortfolioService {
    portfolio_db_set: PortfolioDbSet,
}

impl PortfolioService {
    pub fn new(portfolio_db_set: PortfolioDbSet) -> Self {
        Self { portfolio_db_set }
    }

    pub async fn get_portfolio(&self, user_id: Uuid) -> anyhow::Result<Vec<PortfolioDto>> {
        let models = self
            .portfolio_db_set
            .get_portfolio_with_asset_info(user_id)
            .await?;

        let mut ret_vec: Vec<PortfolioDto> = Vec::new();
        for model in models {
            ret_vec.push(model.into());
        }

        Ok(ret_vec)
    }
}
