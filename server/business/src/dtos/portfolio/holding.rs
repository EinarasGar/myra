use dal::models::portfolio_models::Holding;
use rust_decimal::Decimal;
use uuid::Uuid;

pub struct HoldingDto {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub units: Decimal,
}

impl From<Holding> for HoldingDto {
    fn from(h: Holding) -> Self {
        Self {
            asset_id: h.asset_id,
            account_id: h.account_id,
            units: h.total_quantity,
        }
    }
}
