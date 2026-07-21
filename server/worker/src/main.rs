use apalis::prelude::{Monitor, WorkerError};
use business::jobs::{EmbeddingJob, FileProcessingJob, QuickUploadJob, SyncConnectorBindingJob};
use business::loader::StartupLoader;
use business::service_collection::Services;
use worker::jobs::cron::{
    GenerateChatTitlesJob, RefreshAssetsJob, RefreshOauthTokensJob, SeedAssetHistoryJob,
    SyncConnectorsJob,
};
use worker::jobs::MonitorExt;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    observability::initialize_tracing_subscriber("myra_worker");

    let services = Services::new().await?;
    dal::job_queue::JobQueueHandle::run_migrations(&services.connection.pool).await?;
    tracing::info!("job queue migrations applied");

    StartupLoader::load_all().await?;

    tracing::info!("worker starting");

    Monitor::new()
        .register_job::<EmbeddingJob>(&services)
        .register_job::<FileProcessingJob>(&services)
        .register_job::<QuickUploadJob>(&services)
        .register_job::<SyncConnectorBindingJob>(&services)
        .register_cron::<RefreshAssetsJob>(&services)
        .register_cron::<SeedAssetHistoryJob>(&services)
        .register_cron::<GenerateChatTitlesJob>(&services)
        .register_cron::<SyncConnectorsJob>(&services)
        .register_cron::<RefreshOauthTokensJob>(&services)
        .should_restart(|ctx, error, attempt| {
            if matches!(error, WorkerError::GracefulExit) {
                return false;
            }
            tracing::error!(
                worker = %ctx.name(),
                attempt,
                error = error as &dyn std::error::Error,
                error.type = "WorkerError",
                "worker exited unexpectedly; restarting"
            );
            attempt < 10
        })
        .run()
        .await?;

    Ok(())
}
