use dal::db_sets::portfolio_db_set::PortfolioDbSet;
use dal::{database_context::MyraDb, models::portfolio_models::PortfolioAccountModel};
use uuid::Uuid;

use crate::dtos::portfolio_account_dto::PortfolioAccountDto;
use crate::dtos::portfolio_dto::PortfolioDto;

#[derive(Clone)]
pub struct PortfolioService {
    db_context: MyraDb,
}

impl PortfolioService {
    pub fn new(db: MyraDb) -> Self {
        Self { db_context: db }
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_portfolio(&self, user_id: Uuid) -> anyhow::Result<Vec<PortfolioDto>> {
        let mut conn = self.db_context.get_connection().await?;
        let models = conn.get_portfolio_with_asset_account_info(user_id).await?;
        let ret_vec: Vec<PortfolioDto> = models.iter().map(|val| val.clone().into()).collect();
        Ok(ret_vec)
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn insert_or_update_portfolio_account(
        &self,
        user_id: Uuid,
        account: PortfolioAccountDto,
    ) -> anyhow::Result<PortfolioAccountDto> {
        let account_id = account.account_id.unwrap_or(Uuid::new_v4());
        let model = PortfolioAccountModel {
            id: account_id,
            user_id,
            name: account.account_name,
        };

        let mut conn = self.db_context.get_connection().await?;
        conn.insert_or_update_portfolio_account(model.clone())
            .await?;

        Ok(model.into())
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_portfolio_accounts(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<PortfolioAccountDto>> {
        let mut conn = self.db_context.get_connection().await?;
        let models = conn.get_portfolio_accounts_by_user_id(user_id).await?;
        let ret_models = models.iter().map(|val| val.clone().into()).collect();
        Ok(ret_models)
    }
}
