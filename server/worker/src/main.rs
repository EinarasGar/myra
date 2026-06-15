use apalis::prelude::Monitor;
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
        .run()
        .await?;

    Ok(())
}
