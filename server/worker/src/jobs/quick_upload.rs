use std::sync::Arc;

use ai::models::error::AiError;
use async_trait::async_trait;
use business::dtos::ai_error_dto::AiErrorDto;
use business::dtos::ai_quick_upload_dto::QuickUploadNotification;
use business::jobs::QuickUploadJob;
use business::providers::user_conversation_provider::UserConversationProvider;
use business::service_collection::ai_data_service::AiDataService;
use business::service_collection::ai_quick_upload_service::AiQuickUploadService;
use business::service_collection::ServiceProviders;
use dal::query_params::ai_conversation_params::{ProposalType, QuickUploadStatus};
use uuid::Uuid;

use crate::jobs::WorkerJob;
use crate::retry::{self, RetryDecision};

#[async_trait]
impl WorkerJob for QuickUploadJob {
    const NAME: &'static str = "quick_upload";

    fn decide(error: &anyhow::Error, attempts: i32) -> RetryDecision {
        if matches!(
            retry::extract_ai_error(error),
            AiError::InvalidAttachment { .. }
        ) {
            return RetryDecision::Abort;
        }
        retry::default_decision(error, attempts, &Self::retry_policy())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(quick_upload_id = %quick_upload_id(self)))]
    async fn before_run(&self, providers: &ServiceProviders) -> anyhow::Result<()> {
        let service = AiQuickUploadService::new(providers);
        let quick_upload_id = quick_upload_id(self);
        let step = match self {
            QuickUploadJob::Correction { .. } => "processing_correction",
            _ => "reading_receipt",
        };

        service
            .update_status(quick_upload_id, QuickUploadStatus::Processing)
            .await?;
        let _ = service
            .notify(
                quick_upload_id,
                QuickUploadNotification::Status {
                    step: step.to_string(),
                },
            )
            .await;
        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(quick_upload_id = %quick_upload_id(self)))]
    async fn run(&self, providers: &ServiceProviders) -> anyhow::Result<()> {
        let service = AiQuickUploadService::new(providers);
        match self {
            QuickUploadJob::Process {
                quick_upload_id,
                user_id,
            } => process(providers, &service, *quick_upload_id, *user_id).await,
            QuickUploadJob::Correction {
                quick_upload_id,
                user_id,
                message,
            } => process_correction(providers, &service, *quick_upload_id, *user_id, message).await,
            QuickUploadJob::Retry {
                quick_upload_id,
                user_id,
            } => process_retry(providers, &service, *quick_upload_id, *user_id).await,
        }
    }

    async fn on_failure(
        &self,
        providers: &ServiceProviders,
        decision: &RetryDecision,
        error: &AiError,
    ) {
        let service = AiQuickUploadService::new(providers);
        let quick_upload_id = quick_upload_id(self);
        let dto = AiErrorDto::from(error.clone());

        if let Err(e) = service
            .record_conversation_error(quick_upload_id, &dto)
            .await
        {
            tracing::warn!(
                quick_upload_id = %quick_upload_id,
                error = ?e,
                error.type = "record_conversation_error",
                "failed to record quick upload error"
            );
        }

        match decision {
            RetryDecision::RetryAfter(_) => {
                let _ = service
                    .update_status(quick_upload_id, QuickUploadStatus::Retrying)
                    .await;
                let _ = service
                    .notify(
                        quick_upload_id,
                        QuickUploadNotification::Status {
                            step: "retrying".to_string(),
                        },
                    )
                    .await;
            }
            RetryDecision::Abort => {
                fail(&service, quick_upload_id, &dto).await;
            }
        }
    }
}

fn quick_upload_id(job: &QuickUploadJob) -> Uuid {
    match job {
        QuickUploadJob::Process {
            quick_upload_id, ..
        }
        | QuickUploadJob::Correction {
            quick_upload_id, ..
        }
        | QuickUploadJob::Retry {
            quick_upload_id, ..
        } => *quick_upload_id,
    }
}

async fn fail(service: &AiQuickUploadService, quick_upload_id: Uuid, dto: &AiErrorDto) {
    let _ = service
        .update_status(quick_upload_id, QuickUploadStatus::Failed)
        .await;
    let _ = service
        .notify(
            quick_upload_id,
            QuickUploadNotification::Error { error: dto.clone() },
        )
        .await;
    let _ = service
        .notify(quick_upload_id, QuickUploadNotification::Done)
        .await;
}

struct WorkflowContext {
    config: ai::config::AiConfig,
    data: Arc<business::providers::user_data_provider::UserDataProvider>,
    conv_agent: Arc<UserConversationProvider>,
    rate_limit: Arc<business::providers::user_rate_limiter::UserRateLimiter>,
}

#[tracing::instrument(level = "debug", skip_all, fields(quick_upload_id = %quick_upload_id, user_id = %user_id))]
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

#[tracing::instrument(level = "debug", skip_all, fields(quick_upload_id = %quick_upload_id))]
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

#[tracing::instrument(level = "debug", skip_all, fields(quick_upload_id = %quick_upload_id, user_id = %user_id))]
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

#[tracing::instrument(level = "debug", skip_all, fields(quick_upload_id = %quick_upload_id, user_id = %user_id))]
async fn process_retry(
    providers: &ServiceProviders,
    service: &AiQuickUploadService,
    quick_upload_id: Uuid,
    user_id: Uuid,
) -> anyhow::Result<()> {
    let (ctx, _) = setup(providers, service, quick_upload_id, user_id).await?;

    let _ = service
        .notify(
            quick_upload_id,
            QuickUploadNotification::Status {
                step: "analyzing_receipt".to_string(),
            },
        )
        .await;

    let output = ai::workflows::receipt_processor::retry(
        ctx.config,
        ctx.data,
        ctx.conv_agent,
        ctx.rate_limit,
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

#[tracing::instrument(level = "debug", skip_all, fields(quick_upload_id = %quick_upload_id, user_id = %user_id))]
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
