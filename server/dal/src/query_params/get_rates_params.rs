use std::collections::HashSet;

use sqlx::types::time::OffsetDateTime;

pub struct GetRatesParams {
    pub search_type: GetRatesSeachType,
    pub interval: Option<GetRatesTimeParams>,
    pub limit: Option<u64>,
}

impl Default for GetRatesParams {
    fn default() -> Self {
        Self {
            search_type: GetRatesSeachType::All,
            interval: None,
            limit: None,
        }
    }
}

pub struct GetRatesTimeParams {
    pub start_date: OffsetDateTime,
    pub end_date: OffsetDateTime,
}

pub enum GetRatesSeachType {
    All,
    ByPair(i32, i32),
    ByPairs(HashSet<(i32, i32)>),
}
