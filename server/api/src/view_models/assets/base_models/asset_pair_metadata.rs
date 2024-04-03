use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetPairMetadataViewModel {
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    #[schema(example = json!(dec!(42.57)))]
    pub latest_rate: Decimal,

    #[serde(with = "timestamp")]
    //#[schema(example = json!(datetime!(2023-03-22 13:00:00 UTC)))]
    pub last_updated: OffsetDateTime,
}
