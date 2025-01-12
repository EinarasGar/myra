use time::{Duration, OffsetDateTime};

#[derive(Clone, Copy, Debug)]
pub enum Range {
    Day,
    Week,
    Month,
    SixMonth,
    Year,
    FiveYear,
    All,
    Custom(OffsetDateTime, OffsetDateTime, Duration),
}

impl Range {
    pub fn interval(&self) -> Duration {
        match self {
            Range::Day => Duration::minutes(2),
            Range::Week => Duration::minutes(10),
            Range::Month => Duration::hours(1),
            Range::SixMonth => Duration::days(1),
            Range::Year => Duration::days(1),
            Range::FiveYear => Duration::days(7),
            Range::All => Duration::weeks(52 * 100),
            Range::Custom(_, _, duration) => duration.clone(),
        }
    }

    pub fn start_time(&self) -> Option<OffsetDateTime> {
        match self {
            Range::Day => Some(OffsetDateTime::now_utc() - Duration::days(1)),
            Range::Week => Some(OffsetDateTime::now_utc() - Duration::weeks(1)),
            Range::Month => Some(OffsetDateTime::now_utc() - Duration::days(30)),
            Range::SixMonth => Some(OffsetDateTime::now_utc() - Duration::days(180)),
            Range::Year => {
                let now = OffsetDateTime::now_utc();
                Some(now.replace_year(now.year() - 1).unwrap())
            }
            Range::FiveYear => {
                let now = OffsetDateTime::now_utc();
                Some(now.replace_year(now.year() - 5).unwrap())
            }
            Range::All => None,
            Range::Custom(start, _, _) => Some(start.clone()),
        }
    }

    pub fn end_time(&self) -> OffsetDateTime {
        match self {
            Range::Day => OffsetDateTime::now_utc(),
            Range::Week => OffsetDateTime::now_utc(),
            Range::Month => OffsetDateTime::now_utc(),
            Range::SixMonth => OffsetDateTime::now_utc(),
            Range::Year => OffsetDateTime::now_utc(),
            Range::FiveYear => OffsetDateTime::now_utc(),
            Range::All => OffsetDateTime::now_utc(),
            Range::Custom(_, end, _) => end.clone(),
        }
    }
}
