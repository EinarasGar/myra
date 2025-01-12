use time::{Duration, OffsetDateTime};

use crate::entities::range::Range;

#[derive(Debug, Clone)]
pub enum RangeDto {
    StringBased(String),
    Custom(Option<OffsetDateTime>, OffsetDateTime, Duration),
}

impl TryFrom<RangeDto> for Range {
    type Error = anyhow::Error;

    fn try_from(value: RangeDto) -> Result<Self, Self::Error> {
        match value {
            RangeDto::StringBased(range) => match range.as_str() {
                "1d" => Ok(Range::Day),
                "1w" => Ok(Range::Week),
                "1m" => Ok(Range::Month),
                "3m" => Ok(Range::SixMonth),
                "6m" => Ok(Range::Year),
                "1y" => Ok(Range::FiveYear),
                "all" => Ok(Range::All),
                _ => Err(anyhow::anyhow!("Invalid range string")),
            },
            RangeDto::Custom(start, end, duration) => {
                Ok(Range::Custom(start.unwrap(), end, duration))
            }
        }
    }
}

impl From<Range> for RangeDto {
    fn from(value: Range) -> Self {
        RangeDto::Custom(value.start_time(), value.end_time(), value.interval())
    }
}
