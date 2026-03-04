use std::collections::HashSet;

use sqlx::types::time::OffsetDateTime;

pub struct GetRatesParams {
    pub search_type: GetRatesSeachType,
    pub start_end: Option<GetRatesTimeParams>,
    pub limit: Option<u64>,
}

impl Default for GetRatesParams {
    fn default() -> Self {
        Self {
            search_type: GetRatesSeachType::All,
            start_end: None,
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
