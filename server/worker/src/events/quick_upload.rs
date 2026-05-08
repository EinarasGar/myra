use std::sync::Arc;

use business::dtos::ai_quick_upload_dto::QuickUploadNotification;
use business::providers::user_conversation_provider::UserConversationProvider;
use business::service_collection::ai_data_service::AiDataService;
use business::service_collection::ai_quick_upload_service::AiQuickUploadService;
use business::service_collection::ServiceProviders;
use dal::query_params::ai_conversation_params::{ProposalType, QuickUploadStatus};

use uuid::Uuid;

pub async fn handle(providers: &ServiceProviders, quick_upload_id: Uuid, user_id: Uuid) {
    let service = AiQuickUploadService::new(providers);

    if let Err(e) = service
        .update_status(quick_upload_id, QuickUploadStatus::Processing)
        .await
    {
        tracing::error!("Failed to update quick upload status: {}", e);
        return;
    }

    let _ = service
        .notify(
            quick_upload_id,
            QuickUploadNotification::Status {
                step: "reading_receipt".to_string(),
            },
        )
        .await;

    run_with_error_handling(&service, quick_upload_id, async {
        process(providers, &service, quick_upload_id, user_id).await
    })
    .await;
}

pub async fn handle_correction(
    providers: &ServiceProviders,
    quick_upload_id: Uuid,
    user_id: Uuid,
    message: String,
) {
    let service = AiQuickUploadService::new(providers);

    let _ = service
        .notify(
            quick_upload_id,
            QuickUploadNotification::Status {
                step: "processing_correction".to_string(),
            },
        )
        .await;

    run_with_error_handling(&service, quick_upload_id, async {
        process_correction(providers, &service, quick_upload_id, user_id, &message).await
    })
    .await;
}

async fn run_with_error_handling(
    service: &AiQuickUploadService,
    quick_upload_id: Uuid,
    work: impl std::future::Future<Output = anyhow::Result<()>>,
) {
    if let Err(e) = work.await {
        tracing::error!(quick_upload_id = %quick_upload_id, error = %e, "Quick upload processing failed");
        let _ = service
            .update_status(quick_upload_id, QuickUploadStatus::Failed)
            .await;
        let _ = service
            .notify(
                quick_upload_id,
                QuickUploadNotification::Error {
                    message: e.to_string(),
                },
            )
            .await;
        let _ = service
            .notify(quick_upload_id, QuickUploadNotification::Done)
            .await;
    }
}

struct WorkflowContext {
    config: ai::config::AiConfig,
    data: Arc<business::providers::user_data_provider::UserDataProvider>,
    conv_agent: Arc<UserConversationProvider>,
    rate_limit: Arc<business::providers::user_rate_limiter::UserRateLimiter>,
}

async fn setup(
    providers: &ServiceProviders,
    service: &AiQuickUploadService,
    quick_upload_id: Uuid,
    user_id: Uuid,
) -> anyhow::Result<(
    WorkflowContext,
    business::dtos::ai_quick_upload_dto::QuickUploadDto,
)> {
    let quick_upload = service.get_quick_upload(quick_upload_id, user_id).await?;
    let conv_agent = Arc::new(
        UserConversationProvider::open(providers, user_id, quick_upload.conversation_id).await?,
    );

    let config = ai::config::AiConfig::try_from_env()?;
    let data = Arc::new(
        business::providers::user_data_provider::UserDataProvider::new(
            AiDataService::new(providers),
            user_id,
        ),
    );
    let rate_limit = Arc::new(
        business::providers::user_rate_limiter::UserRateLimiter::new(
            business::rate_limiting::rate_limiter::RateLimiter::new(
                providers.redis.clone(),
                providers.db.clone(),
            ),
            user_id,
        ),
    );

    Ok((
        WorkflowContext {
            config,
            data,
            conv_agent,
            rate_limit,
        },
        quick_upload,
    ))
}

async fn save_and_notify(
    service: &AiQuickUploadService,
    quick_upload_id: Uuid,
    output: ai::workflows::receipt_processor::ReceiptProcessorOutput,
) -> anyhow::Result<()> {
    let proposal_type: ProposalType = output.proposal_type.parse()?;

    service
        .set_proposal(
            quick_upload_id,
            proposal_type.clone(),
            output.proposal.clone(),
        )
        .await?;

    service
        .update_status(quick_upload_id, QuickUploadStatus::ProposalReady)
        .await?;

    service
        .notify(
            quick_upload_id,
            QuickUploadNotification::Proposal {
                proposal_type,
                data: output.proposal,
            },
        )
        .await?;

    service
        .notify(quick_upload_id, QuickUploadNotification::Done)
        .await?;

    Ok(())
}

async fn process(
    providers: &ServiceProviders,
    service: &AiQuickUploadService,
    quick_upload_id: Uuid,
    user_id: Uuid,
) -> anyhow::Result<()> {
    let (ctx, quick_upload) = setup(providers, service, quick_upload_id, user_id).await?;

    let _ = service
        .notify(
            quick_upload_id,
            QuickUploadNotification::Status {
                step: "analyzing_receipt".to_string(),
            },
        )
        .await;

    let output = ai::workflows::receipt_processor::process(
        ctx.config,
        ctx.data,
        ctx.conv_agent,
        ctx.rate_limit,
        quick_upload.source_file_id,
    )
    .await?;

    let _ = service
        .notify(
            quick_upload_id,
            QuickUploadNotification::Status {
                step: "saving_results".to_string(),
            },
        )
        .await;

    save_and_notify(service, quick_upload_id, output).await
}

async fn process_correction(
    providers: &ServiceProviders,
    service: &AiQuickUploadService,
    quick_upload_id: Uuid,
    user_id: Uuid,
    correction: &str,
) -> anyhow::Result<()> {
    let (ctx, _) = setup(providers, service, quick_upload_id, user_id).await?;

    let output = ai::workflows::receipt_processor::correct(
        ctx.config,
        ctx.data,
        ctx.conv_agent,
        ctx.rate_limit,
        correction.to_string(),
    )
    .await?;

    save_and_notify(service, quick_upload_id, output).await
}
