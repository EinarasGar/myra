use serde::{Deserialize, Serialize};
use sqlx::types::{Decimal, Uuid};

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PortfolioCombined {
    pub sum: Decimal,
    pub account_id: Uuid,
    pub account_name: String,
    pub asset_id: i32,
    pub ticker: String,
    pub name: String,
    pub category: String,
    pub base_pair_id: Option<i32>,
    pub base_pair_ticker: Option<String>,
    pub base_pair_name: Option<String>,
    pub base_pair_category: Option<String>,
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
