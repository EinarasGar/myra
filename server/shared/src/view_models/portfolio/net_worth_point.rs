use serde::{Deserialize, Serialize};

/// A single net worth data point. Unlike AssetRateViewModel, the rate
/// can be negative (liabilities exceeding assets).
#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema, uniffi::Record)]
pub struct NetWorthPointViewModel {
    pub date: i64,
    pub rate: f64,
}

#[cfg(feature = "backend")]
impl From<business::dtos::asset_rate_dto::AssetRateDto> for NetWorthPointViewModel {
    fn from(dto: business::dtos::asset_rate_dto::AssetRateDto) -> Self {
        use rust_decimal::prelude::ToPrimitive;
        Self {
            date: dto.date.unix_timestamp(),
            rate: dto.rate.to_f64().unwrap_or(0.0),
        }
    }
}
