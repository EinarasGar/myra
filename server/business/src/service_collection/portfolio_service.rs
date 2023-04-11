use dal::database_context::MyraDb;
use dal::db_sets::portfolio_db_set::PortfolioDbSet;
use uuid::Uuid;

use crate::dtos::portfolio_dto::PortfolioDto;

#[derive(Clone)]
pub struct PortfolioService {
    db_context: MyraDb,
}

impl PortfolioService {
    pub fn new(db: MyraDb) -> Self {
        Self { db_context: db }
    }

    pub async fn get_portfolio(&self, user_id: Uuid) -> anyhow::Result<Vec<PortfolioDto>> {
        let mut conn = self.db_context.get_connection().await?;
        let models = conn.get_portfolio_with_asset_info(user_id).await?;

        let mut ret_vec: Vec<PortfolioDto> = Vec::new();
        for model in models {
            ret_vec.push(model.into());
        }

        Ok(ret_vec)
    }
}
