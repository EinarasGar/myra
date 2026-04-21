use apalis::prelude::Data;
use business::jobs::MyraJob;
use business::service_collection::Services;
use chrono::Utc;
use clap::{Parser, Subcommand};
use uuid::Uuid;

use worker::events::handler::handle_job;
use worker::scheduled::refresh_assets;
use worker::scheduled::seed_asset_history;
use worker::scheduled::CronTick;

#[derive(Parser)]
#[command(version, about = "Manually trigger worker jobs")]
struct Cli {
    #[command(subcommand)]
    job: Jobs,
}

#[derive(Subcommand)]
enum Jobs {
    RefreshAssets,
    SeedAssetHistory,
    EmbedTransaction {
        #[arg(long)]
        transaction_id: Uuid,
        #[arg(long)]
        text: String,
    },
    EmbedTransactionGroup {
        #[arg(long)]
        group_id: Uuid,
        #[arg(long)]
        text: String,
    },
    EmbedAsset {
        #[arg(long)]
        asset_id: i32,
        #[arg(long)]
        text: String,
    },
    EmbedCategory {
        #[arg(long)]
        category_id: i32,
        #[arg(long)]
        text: String,
    },
    ProcessUploadedFile {
        #[arg(long)]
        file_id: Uuid,
        #[arg(long)]
        user_id: Uuid,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    observability::initialize_tracing_subscriber("run_job");

    let cli = Cli::parse();
    let services = Services::new().await?;

    let result = match cli.job {
        Jobs::RefreshAssets => {
            let tick = CronTick::from(Utc::now());
            refresh_assets::tick(tick, Data::new(services)).await
        }
        Jobs::SeedAssetHistory => {
            let tick = CronTick::from(Utc::now());
            seed_asset_history::tick(tick, Data::new(services)).await
        }
        job => {
            let myra_job = match job {
                Jobs::EmbedTransaction {
                    transaction_id,
                    text,
                } => MyraJob::EmbedTransaction {
                    transaction_id,
                    text,
                },
                Jobs::EmbedTransactionGroup { group_id, text } => {
                    MyraJob::EmbedTransactionGroup { group_id, text }
                }
                Jobs::EmbedAsset { asset_id, text } => MyraJob::EmbedAsset { asset_id, text },
                Jobs::EmbedCategory { category_id, text } => {
                    MyraJob::EmbedCategory { category_id, text }
                }
                Jobs::ProcessUploadedFile { file_id, user_id } => {
                    MyraJob::ProcessUploadedFile { file_id, user_id }
                }
                _ => unreachable!(),
            };
            handle_job(myra_job, Data::new(services)).await
        }
    };

    let _ = result;

    observability::shutdown_tracing();
    Ok(())
}
