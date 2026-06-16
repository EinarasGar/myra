use std::fmt::Debug;

use thiserror::Error;
use time::{Duration, OffsetDateTime};

use crate::dtos::net_worth::range_dto::RangeDto;

#[derive(Error, Debug, PartialEq)]
pub enum RangeError {
    #[error("Invalid range string {0}.")]
    InvalidRangeString(String),

    #[error("Start date not specified.")]
    StartDateNotSpecified,
}

#[derive(Clone, Copy, Debug)]
pub struct Range {
    start_time: OffsetDateTime,
    end_time: OffsetDateTime,
    interval: Duration,

    infinite_start: bool,
    #[allow(dead_code)]
    infinite_end: bool,
}

impl TryFrom<RangeDto> for Range {
    type Error = RangeError;

    fn try_from(dto: RangeDto) -> Result<Self, RangeError> {
        match dto {
            RangeDto::StringBased(range) => match range.as_str() {
                "all" => Err(RangeError::StartDateNotSpecified),
                _ => Self::parse_string_range(range.as_str()),
            },
            RangeDto::Custom(start, end, duration) => {
                let start_time = start.ok_or(RangeError::StartDateNotSpecified)?;
                let infinite_end = end.is_none();
                let end_time = end.unwrap_or(OffsetDateTime::now_utc());
                let interval =
                    duration.unwrap_or_else(|| Range::calculate_interval(start_time, end_time));
                Ok(Range {
                    start_time,
                    end_time,
                    interval,
                    infinite_start: false,
                    infinite_end,
                })
            }
        }
    }
}

impl Range {
    pub fn try_from_with_time(
        dto: RangeDto,
        start_time: OffsetDateTime,
    ) -> Result<Self, RangeError> {
        if let RangeDto::StringBased(range) = &dto {
            if range == "all" {
                let end_time = OffsetDateTime::now_utc();
                return Ok(Range {
                    start_time,
                    end_time,
                    interval: Self::calculate_interval(start_time, end_time),
                    infinite_start: true,
                    infinite_end: true,
                });
            }
        }
        if let RangeDto::Custom(start, end, interval) = dto {
            if start.is_none() {
                let forward_dto = RangeDto::Custom(Some(start_time), end, interval);
                let range = forward_dto.try_into();
                if let Ok(range) = range {
                    let new_range = Range {
                        infinite_start: true,
                        ..range
                    };
                    return Ok(new_range);
                }
                return range;
            }
        }
        dto.try_into()
    }

    fn parse_string_range(range: &str) -> Result<Self, RangeError> {
        let now = OffsetDateTime::now_utc();
        let (start_time, interval) = match range {
            "1d" => Ok((now - Duration::days(1), Duration::minutes(5))),
            "1w" => Ok((now - Duration::weeks(1), Duration::minutes(30))),
            "1m" => Ok((now - Duration::days(30), Duration::hours(1))),
            "3m" => Ok((now - Duration::days(90), Duration::days(1))),
            "6m" => Ok((now - Duration::days(180), Duration::days(1))),
            "1y" => Ok((now - Duration::days(365), Duration::days(1))),
            "5y" => Ok((now - Duration::days(365 * 5), Duration::weeks(1))),
            "all" => panic!("Should not be called with all"),
            _ => Err(RangeError::InvalidRangeString(range.to_string())),
        }?;
        Ok(Range {
            start_time,
            end_time: now,
            interval,
            infinite_start: false,
            infinite_end: false,
        })
    }

    fn calculate_interval(start_time: OffsetDateTime, end_time: OffsetDateTime) -> Duration {
        if end_time - start_time <= Duration::days(1) {
            Duration::minutes(5)
        } else if end_time - start_time <= Duration::weeks(1) {
            Duration::minutes(30)
        } else if end_time - start_time <= Duration::days(30) {
            Duration::hours(1)
        } else if end_time - start_time <= Duration::days(365) {
            Duration::days(1)
        } else {
            Duration::days(7)
        }
    }

    pub fn start_time(&self) -> OffsetDateTime {
        self.start_time
    }

    pub fn end_time(&self) -> OffsetDateTime {
        self.end_time
    }

    pub fn interval(&self) -> Duration {
        self.interval
    }

    pub fn infinite_start(&self) -> bool {
        self.infinite_start
    }

    #[allow(dead_code)]
    pub fn infinite_end(&self) -> bool {
        self.infinite_end
    }
}
#[cfg(test)]
mod tests {
    use time::macros::datetime;

    use super::*;

    #[test]
    fn custom_dto_returns_range() {
        let start_time = datetime!(2022-01-01 0:00 UTC);
        let end_time = datetime!(2022-01-02 0:00 UTC);
        let duration = Duration::hours(1);

        let dto = RangeDto::Custom(Some(start_time), Some(end_time), Some(duration));
        let range = Range::try_from(dto.clone()).unwrap();
        assert_eq!(range.start_time, start_time);
        assert_eq!(range.end_time, end_time);
        assert_eq!(range.interval, duration);
        assert!(!range.infinite_start);
        assert!(!range.infinite_end);

        let range = Range::try_from_with_time(dto, start_time).unwrap();
        assert_eq!(range.start_time, start_time);
        assert_eq!(range.end_time, end_time);
        assert_eq!(range.interval, duration);
        assert!(!range.infinite_start);
        assert!(!range.infinite_end);
    }

    #[test]
    fn custom_range_with_no_start_returns_error() {
        let end_time = datetime!(2022-01-02 0:00 UTC);
        let duration = Duration::hours(1);
        let dto = RangeDto::Custom(None, Some(end_time), Some(duration));
        let result = Range::try_from(dto);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), RangeError::StartDateNotSpecified);
    }

    #[test]
    fn custom_range_with_start_returns_range() {
        let start_time = datetime!(2022-01-01 0:00 UTC);
        let end_time = datetime!(2022-01-02 0:00 UTC);
        let duration = Duration::hours(1);

        let dto = RangeDto::Custom(None, Some(end_time), Some(duration));
        let range = Range::try_from_with_time(dto, start_time).unwrap();
        assert_eq!(range.start_time, start_time);
        assert_eq!(range.end_time, end_time);
        assert_eq!(range.interval, duration);
        assert!(range.infinite_start);
        assert!(!range.infinite_end);
    }

    #[test]
    fn all_range_with_no_start_returns_error() {
        let dto = RangeDto::StringBased("all".to_string());
        let result = Range::try_from(dto);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), RangeError::StartDateNotSpecified);
    }

    #[test]
    fn all_range_with_start_returns_range() {
        let start_time = datetime!(2022-01-01 0:00 UTC);

        let dto = RangeDto::StringBased("all".to_string());
        let range = Range::try_from_with_time(dto, start_time).unwrap();
        assert_eq!(range.start_time, start_time);
        assert!(range.infinite_start);
        assert!(range.infinite_end);
    }

    #[test]
    fn string_based_range_returns_correct_range() {
        let dto = RangeDto::StringBased("1d".to_string());
        let range = Range::try_from(dto).unwrap();
        assert_eq!(range.end_time - range.start_time, Duration::days(1));
        assert_eq!(range.interval, Duration::minutes(5));
        assert!(!range.infinite_start);
        assert!(!range.infinite_end);
    }

    #[test]
    fn invalid_string_based_range_returns_error() {
        let dto = RangeDto::StringBased("invalid".to_string());
        let result = Range::try_from(dto);
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            RangeError::InvalidRangeString("invalid".to_string())
        );
    }

    #[test]
    fn custom_range_with_no_end_returns_range() {
        let start_time = datetime!(2022-01-01 0:00 UTC);
        let duration = Duration::hours(1);

        let dto = RangeDto::Custom(Some(start_time), None, Some(duration));
        let range = Range::try_from(dto).unwrap();
        assert_eq!(range.start_time, start_time);
        assert_eq!(range.interval, duration);
        assert!(!range.infinite_start);
        assert!(range.infinite_end);
    }

    #[test]
    fn custom_range_with_no_duration_returns_calculated_interval() {
        let start_time = datetime!(2022-01-01 0:00 UTC);
        let end_time = datetime!(2022-01-02 0:00 UTC);

        let dto = RangeDto::Custom(Some(start_time), Some(end_time), None);
        let range = Range::try_from(dto).unwrap();
        assert_eq!(range.start_time, start_time);
        assert_eq!(range.end_time, end_time);
        assert_eq!(range.interval, Duration::minutes(5));
        assert!(!range.infinite_start);
        assert!(!range.infinite_end);
    }

    #[test]
    fn all_range_returns_calculcated_duration() {
        let start_time = OffsetDateTime::now_utc() - Duration::days(100);
        let dto = RangeDto::StringBased("all".to_string());
        let range = Range::try_from_with_time(dto, start_time).unwrap();
        assert_eq!(range.interval, Duration::days(1));
    }

    #[test]
    fn string_presets_map_to_expected_lookback_and_spacing() {
        fn preset(range: &str) -> Range {
            Range::try_from(RangeDto::StringBased(range.to_string())).unwrap()
        }

        let cases = [
            ("1w", Duration::weeks(1), Duration::minutes(30)),
            ("1m", Duration::days(30), Duration::hours(1)),
            ("3m", Duration::days(90), Duration::days(1)),
            ("6m", Duration::days(180), Duration::days(1)),
            ("1y", Duration::days(365), Duration::days(1)),
            ("5y", Duration::days(365 * 5), Duration::weeks(1)),
        ];

        for (name, lookback, spacing) in cases {
            let range = preset(name);
            assert_eq!(range.end_time() - range.start_time(), lookback, "{name}");
            assert_eq!(range.interval(), spacing, "{name}");
            assert!(!range.infinite_start(), "{name}");
            assert!(!range.infinite_end(), "{name}");
        }
    }

    #[test]
    fn string_preset_end_time_is_now() {
        let range = Range::try_from(RangeDto::StringBased("3m".to_string())).unwrap();
        let delta = OffsetDateTime::now_utc() - range.end_time();
        assert!(delta >= Duration::seconds(0));
        assert!(delta < Duration::minutes(1));
    }

    #[test]
    fn custom_range_interval_follows_span_ladder() {
        fn interval_for(span: Duration) -> Duration {
            let start = datetime!(2022-01-01 0:00 UTC);
            Range::try_from(RangeDto::Custom(Some(start), Some(start + span), None))
                .unwrap()
                .interval()
        }

        assert_eq!(interval_for(Duration::hours(12)), Duration::minutes(5));
        assert_eq!(interval_for(Duration::weeks(1)), Duration::minutes(30));
        assert_eq!(interval_for(Duration::days(8)), Duration::hours(1));
        assert_eq!(interval_for(Duration::days(30)), Duration::hours(1));
        assert_eq!(interval_for(Duration::days(31)), Duration::days(1));
        assert_eq!(interval_for(Duration::days(365)), Duration::days(1));
        assert_eq!(interval_for(Duration::days(400)), Duration::days(7));
    }

    #[test]
    fn try_from_with_time_prefers_dto_start_over_provided_time() {
        let dto_start = datetime!(2022-06-01 0:00 UTC);
        let fallback = datetime!(2020-01-01 0:00 UTC);
        let end_time = datetime!(2022-06-02 0:00 UTC);

        let dto = RangeDto::Custom(Some(dto_start), Some(end_time), Some(Duration::hours(1)));
        let range = Range::try_from_with_time(dto, fallback).unwrap();
        assert_eq!(range.start_time(), dto_start);
        assert_eq!(range.end_time(), end_time);
        assert_eq!(range.interval(), Duration::hours(1));
        assert!(!range.infinite_start());
        assert!(!range.infinite_end());
    }

    #[test]
    fn try_from_with_time_string_preset_ignores_provided_time() {
        let fallback = datetime!(2000-01-01 0:00 UTC);
        let dto = RangeDto::StringBased("1d".to_string());
        let range = Range::try_from_with_time(dto, fallback).unwrap();
        assert_eq!(range.end_time() - range.start_time(), Duration::days(1));
        assert_eq!(range.interval(), Duration::minutes(5));
        assert!(!range.infinite_start());
        assert!(!range.infinite_end());
    }

    #[test]
    fn try_from_with_time_custom_all_none_uses_provided_start_and_now_end() {
        let fallback = OffsetDateTime::now_utc() - Duration::days(10);
        let dto = RangeDto::Custom(None, None, None);
        let range = Range::try_from_with_time(dto, fallback).unwrap();
        assert_eq!(range.start_time(), fallback);
        assert!(range.infinite_start());
        assert!(range.infinite_end());
        assert_eq!(range.interval(), Duration::hours(1));
        let delta = OffsetDateTime::now_utc() - range.end_time();
        assert!(delta >= Duration::seconds(0));
        assert!(delta < Duration::minutes(1));
    }

    #[test]
    fn all_range_with_long_span_uses_weekly_interval() {
        let start_time = OffsetDateTime::now_utc() - Duration::days(400);
        let dto = RangeDto::StringBased("all".to_string());
        let range = Range::try_from_with_time(dto, start_time).unwrap();
        assert_eq!(range.start_time(), start_time);
        assert_eq!(range.interval(), Duration::days(7));
        assert!(range.infinite_start());
        assert!(range.infinite_end());
    }
}
