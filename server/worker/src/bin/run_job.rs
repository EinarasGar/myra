use apalis::prelude::{Attempt, BoxDynError, Data};
use business::jobs::{EmbeddingJob, FileProcessingJob};
use business::service_collection::Services;
use clap::{Parser, Subcommand};
use uuid::Uuid;

use worker::jobs::cron::{RefreshAssetsJob, SeedAssetHistoryJob};
use worker::jobs::{run_job, CronJob};

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

    let result: Result<(), BoxDynError> = match cli.job {
        Jobs::RefreshAssets => RefreshAssetsJob::tick(&services.create_providers())
            .await
            .map_err(Into::into),
        Jobs::SeedAssetHistory => SeedAssetHistoryJob::tick(&services.create_providers())
            .await
            .map_err(Into::into),
        Jobs::EmbedTransaction {
            transaction_id,
            text,
        } => {
            run_job(
                EmbeddingJob::Transaction {
                    transaction_id,
                    text,
                },
                Data::new(services),
                Attempt::new_with_value(1),
            )
            .await
        }
        Jobs::EmbedTransactionGroup { group_id, text } => {
            run_job(
                EmbeddingJob::Group { group_id, text },
                Data::new(services),
                Attempt::new_with_value(1),
            )
            .await
        }
        Jobs::EmbedAsset { asset_id, text } => {
            run_job(
                EmbeddingJob::Asset { asset_id, text },
                Data::new(services),
                Attempt::new_with_value(1),
            )
            .await
        }
        Jobs::EmbedCategory { category_id, text } => {
            run_job(
                EmbeddingJob::Category { category_id, text },
                Data::new(services),
                Attempt::new_with_value(1),
            )
            .await
        }
        Jobs::ProcessUploadedFile { file_id, user_id } => {
            run_job(
                FileProcessingJob { file_id, user_id },
                Data::new(services),
                Attempt::new_with_value(1),
            )
            .await
        }
    };

    let _ = result;

    observability::shutdown_tracing();
    Ok(())
}
