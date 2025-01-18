use time::{Duration, OffsetDateTime};

#[derive(Debug, Clone)]
pub enum RangeDto {
    StringBased(String),
    Custom(
        Option<OffsetDateTime>,
        Option<OffsetDateTime>,
        Option<Duration>,
    ),
}
