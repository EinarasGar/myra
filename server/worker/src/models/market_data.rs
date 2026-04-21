use rust_decimal::Decimal;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct LatestRateEntry {
    pub symbol: String,
    pub rate: Decimal,
}

#[derive(Deserialize)]
pub struct HistoryRateEntry {
    pub rate: Decimal,
    pub timestamp: String,
}

#[derive(Deserialize)]
pub struct HistoryEntry {
    pub symbol: String,
    pub rates: Vec<HistoryRateEntry>,
}

pub struct MarketDataClient {
    client: observability::TracedHttpClient,
    base_url: String,
    api_key: Option<String>,
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
    ) -> Result<Vec<HistoryEntry>, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!(
            "{}/rates/history?symbols={}",
            self.base_url,
            symbols.join(",")
        );
        Ok(self.request(&url).send().await?.json().await?)
    }
}
