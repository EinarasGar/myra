use serde::{Deserialize, Serialize};
use time::{serde::timestamp, OffsetDateTime};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::IntoParams)]
#[into_params(parameter_in = Query)]
pub struct DeleteAssetPairRatesParams {
    /// From which timestamp delete the rates inclusive.
    #[serde(with = "timestamp")]
    #[param(value_type = i32)]
    pub start_timestamp: OffsetDateTime,

    /// Until which timestamp delete the rates inclusive.
    #[serde(with = "timestamp")]
    #[param(value_type = i32)]
    pub end_timestamp: OffsetDateTime,
}
