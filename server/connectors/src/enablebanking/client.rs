use std::collections::HashSet;

use crate::enablebanking::config::base_url;
use crate::models::account::ProviderAccount;
use crate::Result;
use observability::{create_http_client, TracedHttpClient};
use serde::Serialize;
use url::Url;

pub struct EnableBankingClient {
    http: TracedHttpClient,
    base_url: String,
    session_id: String,
}

#[derive(Serialize)]
struct AuthRequest<'a> {
    access: AccessScope<'a>,
    aspsp: Aspsp<'a>,
    state: &'a str,
    redirect_url: &'a str,
    psu_type: &'static str,
}

#[derive(Serialize)]
struct AccessScope<'a> {
    valid_until: &'a str,
}

#[derive(Serialize)]
struct Aspsp<'a> {
    name: &'a str,
    country: &'a str,
}

#[derive(Serialize)]
struct SessionsRequest<'a> {
    code: &'a str,
}

pub async fn list_aspsps(country: &str) -> Result<serde_json::Value> {
    let http = create_http_client();
    let token = crate::enablebanking::jwt::sign_jwt(now_unix())?;
    let resp = http
        .get(Url::parse_with_params(
            &format!("{}/aspsps", base_url()),
            vec![("country", country)],
        )?)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;
    Ok(crate::util::ensure_success(resp).await?.json().await?)
}

impl EnableBankingClient {
    pub fn new(session_id: String) -> Result<Self> {
        crate::enablebanking::jwt::encoding_key()?;
        Ok(Self {
            http: create_http_client(),
            base_url: base_url().to_string(),
            session_id,
        })
    }

    pub async fn start_auth_session(
        &self,
        aspsp_name: &str,
        aspsp_country: &str,
        state: &str,
        redirect_url: &str,
        valid_until: time::OffsetDateTime,
    ) -> Result<String> {
        let body = AuthRequest {
            access: AccessScope {
                valid_until: &rfc3339(valid_until),
            },
            aspsp: Aspsp {
                name: aspsp_name,
                country: aspsp_country,
            },
            state,
            redirect_url,
            psu_type: "personal",
        };
        let token = crate::enablebanking::jwt::sign_jwt(now_unix())?;
        let resp = self
            .http
            .post(format!("{}/auth", self.base_url))
            .header("Authorization", format!("Bearer {}", token))
            .json(&body)
            .send()
            .await?;
        let body: serde_json::Value = crate::util::ensure_success(resp).await?.json().await?;
        body.get("url")
            .and_then(|v| v.as_str())
            .map(str::to_string)
            .ok_or_else(|| anyhow::anyhow!("enablebanking /auth response missing url"))
    }

    pub async fn create_session(&self, code: &str) -> Result<serde_json::Value> {
        let token = crate::enablebanking::jwt::sign_jwt(now_unix())?;
        let resp = self
            .http
            .post(format!("{}/sessions", self.base_url))
            .header("Authorization", format!("Bearer {}", token))
            .json(&SessionsRequest { code })
            .send()
            .await?;
        Ok(crate::util::ensure_success(resp).await?.json().await?)
    }

    pub async fn list_accounts(&self) -> Result<Vec<ProviderAccount>> {
        let body = self.get(&format!("/sessions/{}", self.session_id)).await?;
        Ok(parse_accounts(&body))
    }

    async fn get(&self, path: &str) -> Result<serde_json::Value> {
        let token = crate::enablebanking::jwt::sign_jwt(now_unix())?;
        let resp = crate::util::ensure_success(
            self.http
                .get(format!("{}{}", self.base_url, path))
                .header("Authorization", format!("Bearer {}", token))
                .send()
                .await?,
        )
        .await?;
        Ok(resp.json().await?)
    }
}

fn now_unix() -> i64 {
    time::OffsetDateTime::now_utc().unix_timestamp()
}

fn rfc3339(dt: time::OffsetDateTime) -> String {
    dt.format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_default()
}

fn rfc3339_date(dt: time::OffsetDateTime) -> String {
    dt.date().to_string()
}

fn transactions_url(
    base_url: &str,
    account_uid: &str,
    from: Option<time::OffsetDateTime>,
    continuation_key: Option<&str>,
) -> Result<Url> {
    let mut params: Vec<(String, String)> = vec![
        (
            "dates_from".to_string(),
            from.map(rfc3339_date).unwrap_or_default(),
        ),
        (
            "dates_to".to_string(),
            rfc3339_date(time::OffsetDateTime::now_utc()),
        ),
    ];
    if let Some(key) = continuation_key {
        params.push(("continuation_key".to_string(), key.to_string()));
    }
    Url::parse_with_params(
        &format!("{}/accounts/{}/transactions", base_url, account_uid),
        params,
    )
    .map_err(Into::into)
}

fn parse_transactions_page(body: &serde_json::Value) -> crate::models::sync::FetchedPage {
    use crate::models::sync::{FetchedPage, SyncCursor};

    let items = body
        .get("transactions")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let next_key = body
        .get("continuation_key")
        .and_then(|v| v.as_str())
        .map(str::to_string);
    FetchedPage {
        stream: "transactions".to_string(),
        payload: serde_json::Value::Array(items),
        next_cursor: next_key
            .map(|k| SyncCursor::new(serde_json::json!({ "continuation_key": k }))),
    }
}

#[async_trait::async_trait]
impl crate::port::Connector for EnableBankingClient {
    async fn fetch_page(
        &self,
        from: Option<time::OffsetDateTime>,
        cursor: Option<crate::models::sync::SyncCursor>,
    ) -> Result<crate::models::sync::FetchedPage> {
        let continuation_key = cursor
            .as_ref()
            .and_then(|c| c.value.get("continuation_key"))
            .and_then(|v| v.as_str())
            .map(str::to_string);
        let token = crate::enablebanking::jwt::sign_jwt(now_unix())?;
        let resp = crate::util::ensure_success(
            self.http
                .get(transactions_url(
                    &self.base_url,
                    &self.session_id,
                    from,
                    continuation_key.as_deref(),
                )?)
                .header("Authorization", format!("Bearer {}", token))
                .send()
                .await?,
        )
        .await?;
        let body: serde_json::Value = resp.json().await?;
        Ok(parse_transactions_page(&body))
    }

    fn capabilities(&self) -> crate::port::ProviderCapabilities {
        crate::port::ProviderCapabilities {
            max_history: Some(time::Duration::days(
                crate::enablebanking::config::EnableBankingConfig::get().consent_days,
            )),
        }
    }

    fn map_pages(
        &self,
        pages: &[crate::models::sync::RawPage],
    ) -> Vec<crate::models::transaction::ProviderTransaction> {
        crate::provider::map_pages(crate::provider::ProviderKind::EnableBanking, pages)
    }

    async fn fetch_balance(&self) -> Result<crate::models::balance::ProviderBalance> {
        let body = self
            .get(&format!("/accounts/{}/balances", self.session_id))
            .await?;
        let cash = parse_cash_balance(&body);

        Ok(crate::models::balance::ProviderBalance {
            quantities: vec![],
            cash,
        })
    }
}

fn parse_accounts(body: &serde_json::Value) -> Vec<ProviderAccount> {
    // The `/sessions/{id}` payload carries both `accounts` (an array of uid strings)
    // and `accounts_data` (objects keyed by `uid` with name/currency/type). Prefer
    // `accounts_data` for rich fields, but fall back to plain uids when it's absent.
    let data = body
        .get("accounts_data")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let uids: Vec<String> = body
        .get("accounts")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default();

    let data_uids: HashSet<String> = data
        .iter()
        .filter_map(|item| item.get("uid").and_then(|v| v.as_str()).map(str::to_string))
        .collect();

    data.iter()
        .filter_map(|item| {
            let Some(uid) = item.get("uid").and_then(|v| v.as_str()) else {
                tracing::warn!(item = %item, "enablebanking account entry missing uid — skipping");
                return None;
            };
            Some(ProviderAccount {
                provider_account_id: uid.to_string(),
                display_name: item
                    .get("name")
                    .or_else(|| item.get("resource_id"))
                    .and_then(|v| v.as_str())
                    .unwrap_or(uid)
                    .to_string(),
                currency: item
                    .get("currency")
                    .and_then(|v| v.as_str())
                    .map(str::to_string),
                account_type: item
                    .get("cash_account_type")
                    .and_then(|v| v.as_str())
                    .map(str::to_string),
            })
        })
        .chain(
            uids.into_iter()
                .filter(|uid| !data_uids.contains(uid))
                .map(|uid| ProviderAccount {
                    provider_account_id: uid.clone(),
                    display_name: uid.clone(),
                    currency: None,
                    account_type: None,
                }),
        )
        .collect()
}

fn parse_cash_balance(
    body: &serde_json::Value,
) -> Vec<crate::models::balance::ProviderCashBalance> {
    body.get("balances")
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| {
                    let balance_amount = item.get("balance_amount")?;
                    let currency = balance_amount.get("currency")?.as_str()?.to_string();
                    let amount = balance_amount
                        .get("amount")
                        .and_then(crate::util::parse_decimal)?;
                    Some(crate::models::balance::ProviderCashBalance { currency, amount })
                })
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn cursor_round_trip_preserves_continuation_key() {
        let page = parse_transactions_page(&json!({
            "transactions": [{ "transaction_id": "t1" }],
            "continuation_key": "key-page-2"
        }));
        assert_eq!(page.stream, "transactions");
        assert_eq!(page.payload.as_array().unwrap().len(), 1);

        let cursor = page.next_cursor.expect("expected continuation cursor");
        assert_eq!(cursor.value["continuation_key"], "key-page-2");

        // Round-trip: stored cursor feeds the next request's continuation_key param.
        let extracted = cursor
            .value
            .get("continuation_key")
            .and_then(|v| v.as_str())
            .map(str::to_string);
        assert_eq!(extracted.as_deref(), Some("key-page-2"));
    }

    #[test]
    fn last_page_has_no_cursor() {
        let page = parse_transactions_page(&json!({ "transactions": [] }));
        assert!(page.next_cursor.is_none());
    }

    #[test]
    fn missing_transactions_array_yields_empty_payload() {
        let page = parse_transactions_page(&json!({}));
        assert!(page.payload.as_array().unwrap().is_empty());
        assert!(page.next_cursor.is_none());
    }

    #[test]
    fn transactions_url_includes_continuation_key() {
        let url = transactions_url(
            "https://api.enablebanking.com",
            "uid-1",
            None,
            Some("cont key/with&special"),
        )
        .unwrap();
        assert_eq!(url.path(), "/accounts/uid-1/transactions");
        let pairs: Vec<(String, String)> = url
            .query_pairs()
            .map(|(k, v)| (k.into_owned(), v.into_owned()))
            .collect();
        assert!(pairs.contains(&(
            "continuation_key".to_string(),
            "cont key/with&special".to_string()
        )));
        assert!(pairs.iter().any(|(k, _)| k == "dates_from"));
        assert!(pairs.iter().any(|(k, _)| k == "dates_to"));
    }

    #[test]
    fn transactions_url_omits_continuation_key_when_absent() {
        let url = transactions_url("https://api.enablebanking.com", "uid-1", None, None).unwrap();
        assert!(!url.query_pairs().any(|(k, _)| k == "continuation_key"));
    }

    #[test]
    fn parse_accounts_maps_uid_and_fields() {
        let accounts = parse_accounts(&json!({
            "accounts_data": [
                { "uid": "acc-1", "name": "Checking", "currency": "EUR", "cash_account_type": "CURRENT" },
                { "uid": "acc-2", "resource_id": "res-2", "currency": "USD" }
            ]
        }));
        assert_eq!(accounts.len(), 2);
        assert_eq!(accounts[0].provider_account_id, "acc-1");
        assert_eq!(accounts[0].display_name, "Checking");
        assert_eq!(accounts[0].currency.as_deref(), Some("EUR"));
        assert_eq!(accounts[0].account_type.as_deref(), Some("CURRENT"));
        assert_eq!(accounts[1].provider_account_id, "acc-2");
        assert_eq!(accounts[1].display_name, "res-2");
    }

    #[test]
    fn parse_accounts_reads_plain_uid_array() {
        let accounts = parse_accounts(&json!({
            "accounts": ["uuid-1", "uuid-2", "uuid-3"],
            "accounts_data": []
        }));
        assert_eq!(accounts.len(), 3);
        assert_eq!(accounts[0].provider_account_id, "uuid-1");
        assert_eq!(accounts[0].display_name, "uuid-1");
    }

    #[test]
    fn parse_accounts_combines_data_then_uid_fallback() {
        let accounts = parse_accounts(&json!({
            "accounts": ["uuid-a", "uuid-b"],
            "accounts_data": [{ "uid": "uuid-a", "name": "Named", "currency": "EUR" }]
        }));
        // uuid-a comes from accounts_data with rich fields; uuid-b falls back to the plain array.
        assert_eq!(accounts.len(), 2);
        assert_eq!(accounts[0].provider_account_id, "uuid-a");
        assert_eq!(accounts[0].display_name, "Named");
        assert_eq!(accounts[1].provider_account_id, "uuid-b");
    }

    #[test]
    fn parse_cash_balance_reads_balance_amount() {
        let balances = parse_cash_balance(&json!({
            "balances": [
                { "balance_type": "information", "balance_amount": { "amount": "1234.56", "currency": "EUR" } },
                { "balance_amount": { "amount": 7 } }
            ]
        }));
        assert_eq!(balances.len(), 1);
        assert_eq!(balances[0].amount.to_string(), "1234.56");
        assert_eq!(balances[0].currency, "EUR");
    }
}
