use crate::models::balance::{ProviderAssetBalance, ProviderBalance, ProviderCashBalance};
use crate::models::sync::{FetchedPage, RawPage, SyncCursor};
use crate::models::transaction::ProviderTransaction;
use crate::port::Connector;
use crate::Result;
use base64::Engine;
use observability::{create_http_client, TracedHttpClient};

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Trading212Env {
    Demo,
    Live,
}

pub struct Trading212Client {
    http: TracedHttpClient,
    base_url: String,
    api_key_id: String,
    api_secret: String,
}

impl Trading212Client {
    pub fn new(api_key_id: String, api_secret: String, env: Trading212Env) -> Self {
        let base_url = match env {
            Trading212Env::Demo => "https://demo.trading212.com".to_string(),
            Trading212Env::Live => "https://live.trading212.com".to_string(),
        };
        Self {
            http: create_http_client(),
            base_url,
            api_key_id,
            api_secret,
        }
    }

    fn basic_auth(&self) -> String {
        let creds = base64::engine::general_purpose::STANDARD
            .encode(format!("{}:{}", self.api_key_id, self.api_secret));
        format!("Basic {}", creds)
    }
}

#[async_trait::async_trait]
impl Connector for Trading212Client {
    async fn fetch_page(
        &self,
        from: Option<time::OffsetDateTime>,
        cursor: Option<SyncCursor>,
    ) -> Result<FetchedPage> {
        let (stream, path) = decode_cursor(cursor.as_ref());
        let url = match &path {
            Some(p) if p.starts_with('/') => format!("{}{}", self.base_url, p),
            Some(p) => format!("{}{}?{}", self.base_url, stream_endpoint(&stream), p),
            None => format!("{}{}?limit=50", self.base_url, stream_endpoint(&stream)),
        };

        let resp = crate::util::ensure_success(
            self.http
                .get(&url)
                .header("Authorization", self.basic_auth())
                .send()
                .await?,
        )
        .await?;
        let body: serde_json::Value = resp.json().await?;

        let items: Vec<serde_json::Value> = body
            .get("items")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        let next_page_path = body.get("nextPagePath").and_then(|v| v.as_str());
        let stream_exhausted = page_covers_from(&stream, &items, from)
            || next_page_path.is_none()
            || items.is_empty()
            || next_page_path == path.as_deref();

        let next_cursor = if stream_exhausted {
            next_stream(&stream).map(|next| encode_cursor(next, None))
        } else {
            next_page_path.map(|p| encode_cursor(&stream, Some(p)))
        };

        Ok(FetchedPage {
            stream,
            payload: serde_json::Value::Array(items),
            next_cursor,
        })
    }

    async fn fetch_balance(&self) -> Result<ProviderBalance> {
        let portfolio_url = format!("{}/api/v0/equity/portfolio", self.base_url);
        let portfolio_resp = crate::util::ensure_success(
            self.http
                .get(&portfolio_url)
                .header("Authorization", self.basic_auth())
                .send()
                .await?,
        )
        .await?;
        let portfolio_body: serde_json::Value = portfolio_resp.json().await?;
        let quantities = parse_portfolio_quantities(&portfolio_body);

        let cash_url = format!("{}/api/v0/equity/account/cash", self.base_url);
        let cash_resp = crate::util::ensure_success(
            self.http
                .get(&cash_url)
                .header("Authorization", self.basic_auth())
                .send()
                .await?,
        )
        .await?;
        let cash_body: serde_json::Value = cash_resp.json().await?;
        let cash = parse_cash_balance(&cash_body);

        Ok(ProviderBalance { quantities, cash })
    }

    fn map_pages(&self, pages: &[RawPage]) -> Vec<ProviderTransaction> {
        crate::provider::map_pages(crate::provider::ProviderKind::Trading212, pages)
    }
}

const STREAMS: [&str; 3] = ["transactions", "orders", "dividends"];

fn stream_endpoint(stream: &str) -> &'static str {
    match stream {
        "orders" => "/api/v0/equity/history/orders",
        "dividends" => "/api/v0/history/dividends",
        _ => "/api/v0/history/transactions",
    }
}

fn item_date(stream: &str, item: &serde_json::Value) -> Option<time::OffsetDateTime> {
    let raw = match stream {
        "orders" => item
            .get("fill")
            .and_then(|f| f.get("filledAt"))
            .or_else(|| item.get("order").and_then(|o| o.get("createdAt"))),
        "dividends" => item.get("paidOn"),
        _ => item.get("dateTime"),
    };
    raw.and_then(|v| v.as_str()).and_then(|s| {
        time::OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339).ok()
    })
}

fn next_stream(stream: &str) -> Option<&'static str> {
    let idx = STREAMS.iter().position(|s| *s == stream)?;
    STREAMS.get(idx + 1).copied()
}

fn decode_cursor(cursor: Option<&SyncCursor>) -> (String, Option<String>) {
    let Some(cursor) = cursor else {
        return (STREAMS[0].to_string(), None);
    };
    let value = cursor.as_value();
    if let Some(s) = value.as_str() {
        return (STREAMS[0].to_string(), Some(s.to_string()));
    }
    let stream = value
        .get("stream")
        .and_then(|v| v.as_str())
        .unwrap_or(STREAMS[0])
        .to_string();
    let path = value
        .get("path")
        .and_then(|v| v.as_str())
        .map(str::to_string);
    (stream, path)
}

fn encode_cursor(stream: &str, path: Option<&str>) -> SyncCursor {
    SyncCursor::new(serde_json::json!({ "stream": stream, "path": path }))
}

fn page_covers_from(
    stream: &str,
    items: &[serde_json::Value],
    from: Option<time::OffsetDateTime>,
) -> bool {
    let Some(from) = from else { return false };
    items
        .iter()
        .any(|item| item_date(stream, item).is_some_and(|ts| ts < from))
}

fn parse_portfolio_quantities(body: &serde_json::Value) -> Vec<ProviderAssetBalance> {
    body.as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(|item| {
                    let asset_identifier = item.get("ticker")?.as_str()?.to_string();
                    let quantity = crate::util::parse_decimal(item.get("quantity")?)?;
                    Some(ProviderAssetBalance {
                        asset_identifier,
                        quantity,
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

fn parse_cash_balance(body: &serde_json::Value) -> Vec<ProviderCashBalance> {
    let amount = body
        .get("free")
        .and_then(crate::util::parse_decimal)
        .or_else(|| body.get("total").and_then(crate::util::parse_decimal));

    match amount {
        Some(amount) => {
            let currency = body
                .get("currency")
                .and_then(|v| v.as_str())
                .unwrap_or("GBP")
                .to_string();
            vec![ProviderCashBalance { currency, amount }]
        }
        None => vec![],
    }
}
