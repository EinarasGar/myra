use crate::jobs::CronJob;
use async_trait::async_trait;
use business::service_collection::connector_sync_service::ConnectorSyncService;
use business::service_collection::ServiceProviders;

const SYNC_BATCH_LIMIT: i64 = 50;

pub struct SyncConnectorsJob;

#[async_trait]
impl CronJob for SyncConnectorsJob {
    const NAME: &'static str = "sync_connectors";
    const SCHEDULE: &'static str = "0 */30 * * * *";

    #[tracing::instrument(level = "info", name = "sync_connectors", skip_all)]
    async fn tick(providers: &ServiceProviders) -> anyhow::Result<()> {
        let sync_svc = ConnectorSyncService::new(providers);
        let bindings = sync_svc
            .get_active_stored_bindings(SYNC_BATCH_LIMIT)
            .await?;

        if bindings.is_empty() {
            return Ok(());
        }

        let mut synced = 0;
        let mut total = 0;

        for binding in bindings {
            total += 1;
            if let Err(e) = sync_svc
                .sync_binding(binding.user_id, binding.binding_id)
                .await
            {
                tracing::warn!(
                    binding_id = %binding.binding_id,
                    error = ?e,
                    "failed to sync binding"
                );
                continue;
            }
            synced += 1;
        }

        tracing::info!(
            count = synced,
            attempted = total,
            "synced connector bindings"
        );
        Ok(())
    }
}
