use crate::models::balance::ProviderBalance;
use crate::models::sync::{FetchedPage, RawPage, SyncCursor};
use crate::models::transaction::{ProviderTransaction, SkippedTransaction};
use crate::port::Connector;
use crate::provider::ProviderKind;
use crate::Result;

pub struct ClientSuppliedStream {
    pub stream: String,
    pub items: Vec<serde_json::Value>,
}

pub struct ClientSuppliedConnector {
    pub streams: Vec<ClientSuppliedStream>,
    pub raw_balance: serde_json::Value,
    pub provider_kind: String,
}

impl ClientSuppliedConnector {
    pub fn new(
        streams: Vec<ClientSuppliedStream>,
        raw_balance: serde_json::Value,
        provider_kind: String,
    ) -> Self {
        Self {
            streams,
            raw_balance,
            provider_kind,
        }
    }
}

#[async_trait::async_trait]
impl Connector for ClientSuppliedConnector {
    async fn fetch_page(
        &self,
        _from: Option<time::OffsetDateTime>,
        cursor: Option<SyncCursor>,
    ) -> Result<FetchedPage> {
        let index = cursor
            .as_ref()
            .and_then(|c| c.as_value().get("stream_index"))
            .and_then(|v| v.as_u64())
            .map(|v| v as usize)
            .unwrap_or(0);

        match self.streams.get(index) {
            Some(stream) => {
                let has_next = index + 1 < self.streams.len();
                Ok(FetchedPage {
                    stream: stream.stream.clone(),
                    payload: serde_json::Value::Array(stream.items.clone()),
                    next_cursor: has_next
                        .then(|| SyncCursor::new(serde_json::json!({ "stream_index": index + 1 }))),
                })
            }
            None => Ok(FetchedPage {
                stream: "transactions".to_string(),
                payload: serde_json::Value::Array(Vec::new()),
                next_cursor: None,
            }),
        }
    }

    async fn fetch_balance(&self) -> Result<ProviderBalance> {
        let balance: ProviderBalance = serde_json::from_value(self.raw_balance.clone())?;
        Ok(balance)
    }

    fn map_pages(&self, pages: &[RawPage]) -> Vec<ProviderTransaction> {
        if let Ok(kind) = self.provider_kind.parse::<ProviderKind>() {
            return crate::provider::map_pages(kind, pages);
        }

        let mut skipped = Vec::new();
        for page in pages {
            let Some(items) = page.payload.as_array() else {
                continue;
            };
            for item in items {
                let external_id = item
                    .get("reference")
                    .or_else(|| item.get("transaction_id"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                skipped.push(SkippedTransaction {
                    external_id,
                    reason: format!(
                        "unknown provider kind for client-supplied connector: {}",
                        self.provider_kind
                    ),
                });
            }
        }

        crate::models::transaction::log_skipped(&self.provider_kind, &skipped);
        Vec::new()
    }
}
