use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};
use utoipa::IntoParams;

#[derive(Clone, Debug, Serialize, Deserialize, IntoParams)]
pub struct DeleteAssetPairRatesParams {
    /// From which timestamp delete the rates inclusive.
    #[serde(with = "timestamp")]
    pub start_timestamp: OffsetDateTime,

    /// Until which timestamp delete the rates inclusive.
    #[serde(with = "timestamp")]
    pub end_timestamp: OffsetDateTime,
}
