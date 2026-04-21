use apalis::prelude::*;
use apalis_sql::postgres::PostgresStorage;
use business::jobs::MyraJob;
use business::service_collection::Services;

mod events;
mod models;
mod scheduled;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    observability::initialize_tracing_subscriber("myra_worker");

    let services = Services::new().await?;
    dal::job_queue::JobQueueHandle::<MyraJob>::run_migrations(&services.connection.pool).await?;

    let job_storage: PostgresStorage<MyraJob> = services.get_job_queue_instance().storage();

    let event_worker = WorkerBuilder::new("myra-events")
        .layer(apalis::layers::catch_panic::CatchPanicLayer::new())
        .data(services.clone())
        .backend(job_storage)
        .build_fn(events::handler::handle_job);

    let refresh_assets = scheduled::cron_worker!(
        "refresh-assets",
        "0 */5 * * * *",
        services,
        scheduled::refresh_assets::tick
    );
    let seed_history = scheduled::cron_worker!(
        "seed-asset-history",
        "0 * * * * *",
        services,
        scheduled::seed_asset_history::tick
    );
    tracing::info!("Worker starting");

    Monitor::new()
        .register(event_worker)
        .register(refresh_assets)
        .register(seed_history)
        .run()
        .await?;

    Ok(())
}
