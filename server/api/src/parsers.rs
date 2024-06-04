use std::collections::HashSet;
use std::hash::Hash;

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

fn get_unique_vec<T>(input: &[T]) -> Vec<T>
where
    T: Eq + Hash + Clone,
{
    // Use a HashSet to store unique Ts
    let mut unique_vals: HashSet<T> = HashSet::new();

    // Filter out duplicates and collect unique ids
    input
        .iter()
        .filter_map(|x| {
            // Insert returns false if the value already exists (i.e., it's a duplicate),
            // so we can use this to filter out duplicates and collect only unique values.
            if unique_vals.insert(x.clone()) {
                Some(x.clone())
            } else {
                None
            }
        })
        .collect()
}
