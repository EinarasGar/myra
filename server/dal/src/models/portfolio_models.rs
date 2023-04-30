use serde::{Deserialize, Serialize};
use sqlx::types::{Decimal, Uuid};

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PortfolioCombined {
    pub ticker: String,
    pub name: String,
    pub category: String,
    pub asset_id: i32,
    pub sum: Decimal,
    pub account_id: Uuid,
    pub account_name: String,
}

#[derive(Clone, Debug)]
pub struct PortfolioUpdateModel {
    pub user_id: Uuid,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub sum: Decimal,
}

#[derive(Clone, Debug, sqlx::FromRow)]
pub struct PortfolioAccountModel {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
}

#[derive(Clone, Debug, sqlx::FromRow)]
pub struct PortfolioAccountIdNameModel {
    pub id: Uuid,
    pub name: String,
}
