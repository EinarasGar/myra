use sqlx::types::{time::OffsetDateTime, Uuid};
use time::Duration;

pub struct GetBinnedEntriesParams {
    pub start_date: Option<OffsetDateTime>,
    pub interval: Duration,
    pub user_id: Uuid,
}
