use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PortfolioCombined {
    pub ticker: String,
    pub name: String,
    pub category: String,
    pub asset_id: i32,
    pub sum: Decimal,
}
