use sqlx::types::time::OffsetDateTime;

pub struct GetRatesParams {
    pub search_type: GetRatesSeachType,
    pub interval: GetRatesTimeParams,
}

pub struct GetRatesTimeParams {
    pub start_date: OffsetDateTime,
    pub end_date: OffsetDateTime,
}

pub enum GetRatesSeachType {
    ByPair(i32, i32),
}
