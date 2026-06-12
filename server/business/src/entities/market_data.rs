use time::{Duration, OffsetDateTime};

#[derive(Debug, PartialEq)]
pub enum FetchPlan {
    /// Newest stored rate is within `max_age`; no fetch needed.
    Fresh,
    /// No rows stored; fetch the full history.
    Full,
    /// Rows exist but are older than `max_age`; fetch only rows after this timestamp.
    Since(OffsetDateTime),
}

pub fn plan_fetch(
    newest: Option<OffsetDateTime>,
    now: OffsetDateTime,
    max_age: Duration,
) -> FetchPlan {
    match newest {
        None => FetchPlan::Full,
        Some(ts) if now - ts < max_age => FetchPlan::Fresh,
        Some(ts) => FetchPlan::Since(ts),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use time::macros::datetime;

    #[test]
    fn plan_fetch_with_no_rows_is_full() {
        let now = datetime!(2026-06-07 12:00 UTC);
        assert_eq!(plan_fetch(None, now, Duration::hours(24)), FetchPlan::Full);
    }

    #[test]
    fn plan_fetch_recent_is_fresh() {
        let now = datetime!(2026-06-07 12:00 UTC);
        let newest = datetime!(2026-06-07 0:00 UTC); // 12h ago
        assert_eq!(
            plan_fetch(Some(newest), now, Duration::hours(24)),
            FetchPlan::Fresh
        );
    }

    #[test]
    fn plan_fetch_old_is_since() {
        let now = datetime!(2026-06-07 12:00 UTC);
        let newest = datetime!(2026-06-05 0:00 UTC); // >24h ago
        assert_eq!(
            plan_fetch(Some(newest), now, Duration::hours(24)),
            FetchPlan::Since(newest)
        );
    }
}
