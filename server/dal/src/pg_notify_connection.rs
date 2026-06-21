use sqlx::postgres::PgListener;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

const CHANNEL: &str = "ai_events";

#[derive(Debug, Clone)]
pub struct PgNotifyEvent {
    pub entity_id: String,
    pub payload: serde_json::Value,
}

#[derive(Clone)]
pub struct PgNotifyConnection {
    pool: PgPool,
    subscribers: Arc<RwLock<HashMap<String, broadcast::Sender<PgNotifyEvent>>>>,
}

impl PgNotifyConnection {
    pub fn new(pool: PgPool) -> Self {
        let subscribers = Arc::new(RwLock::new(HashMap::new()));

        let listener_pool = pool.clone();
        let listener_subscribers = subscribers.clone();
        tokio::spawn(async move {
            let mut consecutive_failures: u32 = 0;
            loop {
                if let Err(e) = Self::listen_loop(&listener_pool, &listener_subscribers).await {
                    consecutive_failures += 1;
                    if consecutive_failures == 1 || consecutive_failures.is_multiple_of(30) {
                        tracing::warn!(
                            channel = %CHANNEL,
                            attempt = consecutive_failures,
                            error = ?e,
                            error.type = "sqlx::Error",
                            "pg notify listener disconnected, reconnecting"
                        );
                    }
                    let backoff_secs = 2u64.saturating_pow(consecutive_failures.min(5)).min(30);
                    tokio::time::sleep(std::time::Duration::from_secs(backoff_secs)).await;
                } else {
                    consecutive_failures = 0;
                }
            }
        });

        Self { pool, subscribers }
    }

    async fn listen_loop(
        pool: &PgPool,
        subscribers: &Arc<RwLock<HashMap<String, broadcast::Sender<PgNotifyEvent>>>>,
    ) -> Result<(), sqlx::Error> {
        let mut listener = PgListener::connect_with(pool).await?;
        listener.listen(CHANNEL).await?;
        tracing::info!(channel = %CHANNEL, "pg notify listener started");

        loop {
            let notification = listener.recv().await?;
            let raw_payload = notification.payload();

            let parsed = match serde_json::from_str::<serde_json::Value>(raw_payload) {
                Ok(v) => v,
                Err(_) => continue,
            };

            let entity_id = match parsed.get("entity_id").and_then(|id| id.as_str()) {
                Some(id) => id.to_string(),
                None => continue,
            };

            let inner_payload = match parsed.get("payload") {
                Some(p) => p.clone(),
                None => continue,
            };

            let event = PgNotifyEvent {
                entity_id: entity_id.clone(),
                payload: inner_payload,
            };

            let should_remove = {
                let subs = subscribers.read().await;
                if let Some(sender) = subs.get(&entity_id) {
                    sender.send(event).is_err()
                } else {
                    false
                }
            };
            if should_remove {
                subscribers.write().await.remove(&entity_id);
            }
        }
    }

    pub async fn subscribe(&self, entity_id: &str) -> broadcast::Receiver<PgNotifyEvent> {
        let mut subs = self.subscribers.write().await;

        if let Some(sender) = subs.get(entity_id) {
            return sender.subscribe();
        }

        let (sender, receiver) = broadcast::channel(64);
        subs.insert(entity_id.to_string(), sender);
        receiver
    }

    pub async fn notify(
        &self,
        entity_id: &str,
        payload: &impl serde::Serialize,
    ) -> Result<(), sqlx::Error> {
        let wrapped = serde_json::json!({
            "entity_id": entity_id,
            "payload": payload,
        });
        sqlx::query("SELECT pg_notify($1, $2)")
            .bind(CHANNEL)
            .bind(wrapped.to_string())
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
