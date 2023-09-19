use dal::models::{asset_pair_rate::AssetPairRate, asset_rate::AssetRate};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::{serde::iso8601, OffsetDateTime};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AssetQuantityDto {
    pub rate: Decimal,
    pub asset_id: i32,
}
