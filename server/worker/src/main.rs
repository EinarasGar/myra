use apalis::prelude::{Monitor, WorkerError};
use business::jobs::{EmbeddingJob, FileProcessingJob, QuickUploadJob};
use business::service_collection::Services;
use worker::jobs::cron::{GenerateChatTitlesJob, RefreshAssetsJob, SeedAssetHistoryJob};
use worker::jobs::MonitorExt;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    observability::initialize_tracing_subscriber("myra_worker");

    let services = Services::new().await?;
    dal::job_queue::JobQueueHandle::run_migrations(&services.connection.pool).await?;

    tracing::info!("Worker starting");

    Monitor::new()
        .register_job::<EmbeddingJob>(&services)
        .register_job::<FileProcessingJob>(&services)
        .register_job::<QuickUploadJob>(&services)
        .register_cron::<RefreshAssetsJob>(&services)
        .register_cron::<SeedAssetHistoryJob>(&services)
        .register_cron::<GenerateChatTitlesJob>(&services)
        .should_restart(|ctx, error, attempt| {
            if matches!(error, WorkerError::GracefulExit) {
                return false;
            }
            tracing::error!(
                worker = %ctx.name(),
                attempt,
                %error,
                "worker exited unexpectedly; restarting"
            );
            attempt < 10
        })
        .run()
        .await?;

    Ok(())
}
