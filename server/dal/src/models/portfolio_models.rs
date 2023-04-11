use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PortfolioCombined {
    pub ticker: String,
    pub name: String,
    pub category: String,
    pub asset_id: i32,
    pub sum: Decimal,
}

#[derive(Clone, Debug)]
pub struct PortfolioUpdateModel {
    pub user_id: Uuid,
    pub asset_id: i32,
    pub sum: Decimal,
}
