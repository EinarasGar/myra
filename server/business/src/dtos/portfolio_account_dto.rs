use dal::models::portfolio_models::{PortfolioAccountIdNameModel, PortfolioAccountModel};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioAccountDto {
    pub account_id: Option<Uuid>,
    pub account_name: String,
}

impl From<PortfolioAccountModel> for PortfolioAccountDto {
    fn from(p: PortfolioAccountModel) -> Self {
        Self {
            account_id: Some(p.id),
            account_name: p.name,
        }
    }
}

impl From<PortfolioAccountIdNameModel> for PortfolioAccountDto {
    fn from(p: PortfolioAccountIdNameModel) -> Self {
        Self {
            account_id: Some(p.id),
            account_name: p.name,
        }
    }
}
