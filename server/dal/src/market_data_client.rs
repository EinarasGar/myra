use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

use crate::models::asset_models::{asset_type_ids, HeldAssetPairDetailModel};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum AssetClass {
    Currency,
    Crypto,
    Other,
}

impl AssetClass {
    pub fn from_asset_type_id(id: i32) -> Self {
        match id {
            asset_type_ids::CURRENCY => AssetClass::Currency,
            asset_type_ids::CRYPTO => AssetClass::Crypto,
            _ => AssetClass::Other,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct PairRequest {
    pub base: String,
    pub base_type: AssetClass,
    pub quote: String,
    pub quote_type: AssetClass,
}

impl From<&HeldAssetPairDetailModel> for PairRequest {
    fn from(p: &HeldAssetPairDetailModel) -> Self {
        Self {
            base: p.asset_ticker.clone(),
            base_type: AssetClass::from_asset_type_id(p.asset_type),
            quote: p.base_ticker.clone(),
            quote_type: AssetClass::from_asset_type_id(p.base_asset_type),
        }
    }
}

#[derive(Serialize)]
struct RatesRequestBody<'a> {
    pairs: &'a [PairRequest],
    #[serde(skip_serializing_if = "Option::is_none")]
    from: Option<i64>,
}

#[derive(Deserialize)]
pub struct LatestRateEntry {
    pub base: String,
    pub quote: String,
    pub rate: Decimal,
}

#[derive(Deserialize)]
struct RawHistoryRateEntry {
    rate: Decimal,
    timestamp: String,
}

#[derive(Deserialize)]
struct RawHistoryEntry {
    base: String,
    quote: String,
    rates: Vec<RawHistoryRateEntry>,
}

pub struct HistoryRateEntry {
    pub rate: Decimal,
    pub recorded_at: OffsetDateTime,
}

pub struct HistoryEntry {
    pub base: String,
    pub quote: String,
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
        let mut req = self.client.post(url);
        if let Some(key) = &self.api_key {
            req = req.header("x-api-key", key);
        }
        req
    }

    #[tracing::instrument(skip_all, fields(pairs = %pairs_label(pairs)))]
    pub async fn get_latest(
        &self,
        pairs: &[PairRequest],
    ) -> Result<Vec<LatestRateEntry>, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/rates/latest", self.base_url);
        Ok(self
            .request(&url)
            .json(&RatesRequestBody { pairs, from: None })
            .send()
            .await?
            .json()
            .await?)
    }

    #[tracing::instrument(skip_all, fields(pairs = %pairs_label(pairs)))]
    pub async fn get_history(
        &self,
        pairs: &[PairRequest],
        from: Option<OffsetDateTime>,
    ) -> Result<Vec<HistoryEntry>, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/rates/history", self.base_url);
        let body = RatesRequestBody {
            pairs,
            from: from.map(|f| f.unix_timestamp()),
        };

        let raw: Vec<RawHistoryEntry> = self.request(&url).json(&body).send().await?.json().await?;

        Ok(raw
            .into_iter()
            .map(|entry| HistoryEntry {
                base: entry.base,
                quote: entry.quote,
                rates: entry
                    .rates
                    .into_iter()
                    .filter_map(|r| {
                        OffsetDateTime::parse(&r.timestamp, &Rfc3339)
                            .map_err(|e| {
                                tracing::warn!(
                                    timestamp = %r.timestamp,
                                    error = %e,
                                    "unparseable history timestamp, skipping"
                                )
                            })
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

fn pairs_label(pairs: &[PairRequest]) -> String {
    pairs
        .iter()
        .map(|p| format!("{}/{}", p.base, p.quote))
        .collect::<Vec<_>>()
        .join(",")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_asset_type_ids_to_classes() {
        assert_eq!(AssetClass::from_asset_type_id(1), AssetClass::Currency);
        assert_eq!(AssetClass::from_asset_type_id(7), AssetClass::Crypto);
        assert_eq!(AssetClass::from_asset_type_id(2), AssetClass::Other);
        assert_eq!(AssetClass::from_asset_type_id(5), AssetClass::Other);
    }

    #[test]
    fn serializes_pair_request_with_lowercase_classes() {
        let pair = PairRequest {
            base: "BTC".into(),
            base_type: AssetClass::Crypto,
            quote: "EUR".into(),
            quote_type: AssetClass::Currency,
        };
        let json = serde_json::to_value(&pair).unwrap();
        assert_eq!(
            json,
            serde_json::json!({
                "base": "BTC",
                "base_type": "crypto",
                "quote": "EUR",
                "quote_type": "currency"
            })
        );
    }

    #[test]
    fn history_body_omits_missing_from() {
        let body = RatesRequestBody {
            pairs: &[],
            from: None,
        };
        let json = serde_json::to_value(&body).unwrap();
        assert_eq!(json, serde_json::json!({ "pairs": [] }));
    }

    #[test]
    fn history_body_includes_from_when_present() {
        let body = RatesRequestBody {
            pairs: &[],
            from: Some(1_686_523_200),
        };
        let json = serde_json::to_value(&body).unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "pairs": [], "from": 1_686_523_200_i64 })
        );
    }
}
