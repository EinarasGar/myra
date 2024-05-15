use time::Duration;

pub fn parse_duration_string(duration: String) -> anyhow::Result<Duration> {
    match duration.as_str() {
        "1m" => Ok(Duration::minutes(1)),
        "5m" => Ok(Duration::minutes(5)),
        "15m" => Ok(Duration::minutes(15)),
        "30m" => Ok(Duration::minutes(30)),
        "1h" => Ok(Duration::hours(1)),
        "4h" => Ok(Duration::hours(4)),
        "1d" => Ok(Duration::days(1)),
        "1w" => Ok(Duration::weeks(1)),
        "1M" => Ok(Duration::days(30)),
        "1y" => Ok(Duration::days(365)),
        _ => Err(anyhow::anyhow!("Duration {} is invalid,", duration)),
    }
}
