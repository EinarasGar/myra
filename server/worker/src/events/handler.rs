//! Dispatches `MyraJob` variants from the Postgres queue to the
//! appropriate handler module.

use apalis::prelude::{BoxDynError, Data};
use business::jobs::MyraJob;
use business::service_collection::Services;

#[tracing::instrument(skip_all)]
pub async fn handle_job(job: MyraJob, services: Data<Services>) -> Result<(), BoxDynError> {
    let providers = services.create_providers();

    match job {
        MyraJob::EmbedTransaction {
            transaction_id,
            text,
        } => {
            super::embedding::handle_transaction(&providers, transaction_id, &text).await?;
        }
        MyraJob::EmbedTransactionGroup { group_id, text } => {
            super::embedding::handle_group(&providers, group_id, &text).await?;
        }
        MyraJob::EmbedAsset { asset_id, text } => {
            super::embedding::handle_asset(&providers, asset_id, &text).await?;
        }
        MyraJob::EmbedCategory { category_id, text } => {
            super::embedding::handle_category(&providers, category_id, &text).await?;
        }
        MyraJob::ProcessUploadedFile { file_id, user_id } => {
            super::file_processing::handle(&providers, file_id, user_id).await?;
        }
        MyraJob::ProcessQuickUpload {
            quick_upload_id,
            user_id,
        } => {
            super::quick_upload::handle(&providers, quick_upload_id, user_id).await;
        }
        MyraJob::ProcessQuickUploadCorrection {
            quick_upload_id,
            user_id,
            message,
        } => {
            super::quick_upload::handle_correction(&providers, quick_upload_id, user_id, message)
                .await;
        }
    };

    Ok(())
}
