use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetQuantityDto {
    pub rate: Decimal,
    pub asset_id: i32,
}
