use rust_decimal::Decimal;
use serde::Deserialize;
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

#[derive(Deserialize)]
pub struct LatestRateEntry {
    pub symbol: String,
    pub rate: Decimal,
}

#[derive(Deserialize)]
struct RawHistoryRateEntry {
    rate: Decimal,
    timestamp: String,
}

#[derive(Deserialize)]
struct RawHistoryEntry {
    symbol: String,
    rates: Vec<RawHistoryRateEntry>,
}

pub struct HistoryRateEntry {
    pub rate: Decimal,
    pub recorded_at: OffsetDateTime,
}

pub struct HistoryEntry {
    pub symbol: String,
    pub rates: Vec<HistoryRateEntry>,
}

pub struct MarketDataClient {
    client: observability::TracedHttpClient,
    base_url: String,
    api_key: Option<String>,
}

impl Default for MarketDataClient {
    fn default() -> Self {
        Self::new()
    }
}

impl MarketDataClient {
    pub fn new() -> Self {
        let base_url =
            std::env::var("MARKET_DATA_URL").unwrap_or_else(|_| "http://localhost:7009".into());
        let api_key = std::env::var("MARKET_DATA_API_KEY")
            .ok()
            .filter(|k| !k.is_empty());
        Self {
            client: observability::create_http_client(),
            base_url,
            api_key,
        }
    }

    fn request(&self, url: &str) -> observability::TracedRequestBuilder {
        let mut req = self.client.get(url);
        if let Some(key) = &self.api_key {
            req = req.header("x-api-key", key);
        }
        req
    }

    pub async fn get_latest(
        &self,
        symbols: &[&str],
    ) -> Result<Vec<LatestRateEntry>, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!(
            "{}/rates/latest?symbols={}",
            self.base_url,
            symbols.join(",")
        );
        Ok(self.request(&url).send().await?.json().await?)
    }

    pub async fn get_history(
        &self,
        symbols: &[&str],
        from: Option<OffsetDateTime>,
    ) -> Result<Vec<HistoryEntry>, Box<dyn std::error::Error + Send + Sync>> {
        let mut url = format!(
            "{}/rates/history?symbols={}",
            self.base_url,
            symbols.join(",")
        );
        if let Some(from) = from {
            url.push_str(&format!("&from={}", from.unix_timestamp()));
        }

        let raw: Vec<RawHistoryEntry> = self.request(&url).send().await?.json().await?;

        Ok(raw
            .into_iter()
            .map(|entry| HistoryEntry {
                symbol: entry.symbol,
                rates: entry
                    .rates
                    .into_iter()
                    .filter_map(|r| {
                        OffsetDateTime::parse(&r.timestamp, &Rfc3339)
                            .ok()
                            .map(|recorded_at| HistoryRateEntry {
                                rate: r.rate,
                                recorded_at,
                            })
                    })
                    .collect(),
            })
            .collect())
    }
}
