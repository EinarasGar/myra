use crate::models::account::ProviderAccount;
use crate::models::balance::{ProviderBalance, ProviderCashBalance};
use crate::models::sync::{FetchedPage, RawPage, SyncCursor};
use crate::models::transaction::ProviderTransaction;
use crate::port::{Connector, ProviderCapabilities};
use crate::truelayer::auth::api_base;
use crate::Result;
use observability::{create_http_client, TracedHttpClient};
use url::Url;

pub struct TrueLayerClient {
    http: TracedHttpClient,
    base_url: String,
    access_token: String,
    account_id: String,
}

impl TrueLayerClient {
    pub fn new(access_token: String, account_id: String) -> Self {
        Self {
            http: create_http_client(),
            base_url: api_base().to_string(),
            access_token,
            account_id,
        }
    }

    pub async fn list_accounts(access_token: &str) -> Result<Vec<ProviderAccount>> {
        let http = create_http_client();

        let accounts_body = Self::fetch_data(&http, access_token, "/data/v1/accounts").await?;
        let mut accounts = parse_accounts(&accounts_body);

        // Cards are a separate TrueLayer resource. Fold them into the same list so callers see
        // one flat account set. A missing `cards` consent scope makes this 403 — that must not
        // fail bank-account discovery, so we log and continue with accounts only.
        match Self::fetch_data(&http, access_token, "/data/v1/cards").await {
            Ok(cards_body) => accounts.extend(parse_accounts(&cards_body)),
            Err(e) => {
                tracing::warn!(error = %e, "truelayer /data/v1/cards fetch failed — returning bank accounts only");
            }
        }

        Ok(accounts)
    }

    async fn fetch_data(
        http: &TracedHttpClient,
        access_token: &str,
        path: &str,
    ) -> Result<serde_json::Value> {
        let resp = crate::util::ensure_success(
            http.get(format!("{}{}", api_base(), path))
                .header("Authorization", format!("Bearer {}", access_token))
                .send()
                .await?,
        )
        .await?;
        Ok(resp.json().await?)
    }

    fn bearer(&self) -> String {
        format!("Bearer {}", self.access_token)
    }

    /// Builds the transaction-history URL for a TrueLayer resource segment (`accounts` or
    /// `cards`) over the sync window.
    fn transactions_url(&self, resource: &str, from: Option<time::OffsetDateTime>) -> Result<Url> {
        let from_str = from
            .map(|d| {
                d.format(&time::format_description::well_known::Rfc3339)
                    .unwrap_or_default()
            })
            .unwrap_or_default();
        let to_str = time::OffsetDateTime::now_utc()
            .format(&time::format_description::well_known::Rfc3339)
            .unwrap_or_default();
        Url::parse_with_params(
            &format!(
                "{}/data/v1/{}/{}/transactions",
                self.base_url, resource, self.account_id
            ),
            vec![
                ("from", from_str),
                ("to", to_str),
                ("booking_status", "booked".to_string()),
            ],
        )
        .map_err(Into::into)
    }
}

fn parse_link_next(header: &str) -> Option<String> {
    header.split(',').find_map(|part| {
        let (url_part, params) = part.split_once(';')?;
        if !params.to_ascii_lowercase().contains("rel=\"next\"")
            && !params.to_ascii_lowercase().contains("rel=next")
        {
            return None;
        }
        Some(
            url_part
                .trim()
                .trim_start_matches('<')
                .trim_end_matches('>')
                .to_string(),
        )
    })
}

fn parse_accounts(body: &serde_json::Value) -> Vec<ProviderAccount> {
    let items = body
        .get("results")
        .and_then(|r| r.as_array())
        .cloned()
        .unwrap_or_default();
    items
        .iter()
        .filter_map(|item| {
            let Some(account_id) = item.get("account_id").and_then(|v| v.as_str()) else {
                tracing::warn!(item = %item, "truelayer account entry missing account_id — skipping");
                return None;
            };
            let display_name = item
                .get("display_name")
                .and_then(|v| v.as_str())
                .unwrap_or(account_id)
                .to_string();
            Some(ProviderAccount {
                provider_account_id: account_id.to_string(),
                display_name,
                currency: item.get("currency").and_then(|v| v.as_str()).map(str::to_string),
                account_type: item
                    .get("account_type")
                    .or_else(|| item.get("card_type"))
                    .and_then(|v| v.as_str())
                    .map(str::to_string),
            })
        })
        .collect()
}

#[async_trait::async_trait]
impl Connector for TrueLayerClient {
    async fn fetch_page(
        &self,
        from: Option<time::OffsetDateTime>,
        cursor: Option<SyncCursor>,
    ) -> Result<FetchedPage> {
        let resp = match cursor
            .as_ref()
            .and_then(|c| c.value.get("url"))
            .and_then(|v| v.as_str())
        {
            // Continuation page: the previous page's `Link: next` URL already targets the
            // right resource (accounts or cards), so follow it verbatim.
            Some(next_url) => {
                crate::util::ensure_success(
                    self.http
                        .get(Url::parse(next_url)?)
                        .header("Authorization", self.bearer())
                        .send()
                        .await?,
                )
                .await?
            }
            // First page: bank-account transactions live under `/accounts/{id}`, card
            // transactions under `/cards/{id}` — identical shape. Probe accounts first; a
            // `404 account_not_found` means this binding is a card, so fall back to cards.
            None => {
                let accounts_resp = self
                    .http
                    .get(self.transactions_url("accounts", from)?)
                    .header("Authorization", self.bearer())
                    .send()
                    .await?;
                if accounts_resp.status().as_u16() == 404 {
                    crate::util::ensure_success(
                        self.http
                            .get(self.transactions_url("cards", from)?)
                            .header("Authorization", self.bearer())
                            .send()
                            .await?,
                    )
                    .await?
                } else {
                    crate::util::ensure_success(accounts_resp).await?
                }
            }
        };
        let next_url = parse_link_next(
            resp.headers()
                .get("link")
                .and_then(|v| v.to_str().ok())
                .unwrap_or(""),
        );
        let body: serde_json::Value = resp.json().await?;

        let items: Vec<serde_json::Value> = body
            .get("results")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        Ok(FetchedPage {
            stream: "transactions".to_string(),
            payload: serde_json::Value::Array(items),
            next_cursor: next_url.map(|u| SyncCursor::new(serde_json::json!({ "url": u }))),
        })
    }

    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            max_history: Some(time::Duration::days(90)),
        }
    }

    fn map_pages(&self, pages: &[RawPage]) -> Vec<ProviderTransaction> {
        crate::provider::map_pages(crate::provider::ProviderKind::TrueLayer, pages)
    }

    async fn fetch_balance(&self) -> Result<ProviderBalance> {
        let url = format!(
            "{}/data/v1/accounts/{}/balance",
            self.base_url, self.account_id
        );
        let resp = crate::util::ensure_success(
            self.http
                .get(&url)
                .header("Authorization", self.bearer())
                .send()
                .await?,
        )
        .await?;
        let body: serde_json::Value = resp.json().await?;
        let cash = parse_cash_balance(&body);

        Ok(ProviderBalance {
            quantities: vec![],
            cash,
        })
    }
}

fn parse_cash_balance(body: &serde_json::Value) -> Vec<ProviderCashBalance> {
    body.get("results")
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| {
                    let currency = item.get("currency")?.as_str()?.to_string();
                    let amount = item
                        .get("available")
                        .and_then(crate::util::parse_decimal)
                        .or_else(|| item.get("current").and_then(crate::util::parse_decimal))?;
                    Some(ProviderCashBalance { currency, amount })
                })
                .collect()
        })
        .unwrap_or_default()
}
