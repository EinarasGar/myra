use time::{Duration, OffsetDateTime};

/// `asset_type` id for currencies (matches the value used in `get_currency_cross_pairs`).
const CURRENCY_ASSET_TYPE: i32 = 1;

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

pub fn build_market_symbol(
    ticker1: &str,
    ticker2: &str,
    asset_type1: i32,
    asset_type2: i32,
) -> String {
    if asset_type1 == CURRENCY_ASSET_TYPE && asset_type2 == CURRENCY_ASSET_TYPE {
        format!("{ticker1}{ticker2}")
    } else {
        ticker1.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use time::macros::datetime;

    #[test]
    fn symbol_for_two_currencies_is_concatenated() {
        assert_eq!(build_market_symbol("USD", "EUR", 1, 1), "USDEUR");
    }

    #[test]
    fn symbol_for_non_currency_is_first_ticker() {
        assert_eq!(build_market_symbol("AAPL", "USD", 2, 1), "AAPL");
    }

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
