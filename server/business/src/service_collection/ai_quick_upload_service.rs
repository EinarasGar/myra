#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::job_queue::JobQueueHandle;
use dal::models::ai_conversation_models::QuickUploadModel;
use dal::pg_notify_connection::{PgNotifyConnection, PgNotifyEvent};
use dal::queries::{ai_conversation_queries, ai_quick_upload_queries};
use dal::query_params::ai_conversation_params::{
    GetQuickUploadsParams, ProposalType, QuickUploadStatus,
};

use itertools::Itertools;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::dtos::ai_quick_upload_dto::{QuickUploadDto, QuickUploadNotification};
use crate::jobs::MyraJob;

#[derive(Clone)]
pub struct AiQuickUploadService {
    db: MyraDb,
    pg_notify: PgNotifyConnection,
    queue: JobQueueHandle<MyraJob>,
}

impl AiQuickUploadService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            db: providers.db.clone(),
            pg_notify: providers.pg_notify.clone(),
            queue: providers.job_queue.clone(),
        }
    }

    pub async fn create_quick_upload(
        &self,
        user_id: Uuid,
        source_file_id: Uuid,
    ) -> anyhow::Result<QuickUploadDto> {
        let conv_query = ai_conversation_queries::create_conversation(user_id, None);
        let conv_id: Uuid = self.db.fetch_one_scalar(conv_query).await?;

        let qu_query = ai_quick_upload_queries::create_quick_upload(conv_id, source_file_id);
        let qu_id: Uuid = self.db.fetch_one_scalar(qu_query).await?;

        self.queue
            .push(MyraJob::ProcessQuickUpload {
                quick_upload_id: qu_id,
                user_id,
            })
            .await?;

        Ok(QuickUploadDto {
            id: qu_id,
            conversation_id: conv_id,
            status: QuickUploadStatus::Pending,
            source_file_id,
            proposal_type: None,
            proposal_data: None,
            created_at: time::OffsetDateTime::now_utc(),
            updated_at: time::OffsetDateTime::now_utc(),
        })
    }

    pub async fn get_quick_upload(
        &self,
        quick_upload_id: Uuid,
        user_id: Uuid,
    ) -> anyhow::Result<QuickUploadDto> {
        let query = ai_quick_upload_queries::get_quick_uploads(GetQuickUploadsParams::by_id(
            quick_upload_id,
            user_id,
        ));
        let model: QuickUploadModel = self.db.fetch_one(query).await?;
        Ok(model.into())
    }

    pub async fn get_quick_uploads(
        &self,
        user_id: Uuid,
        unfinished_only: bool,
    ) -> anyhow::Result<Vec<QuickUploadDto>> {
        let status_filter = if unfinished_only {
            Some(vec![
                QuickUploadStatus::Pending,
                QuickUploadStatus::Processing,
                QuickUploadStatus::ProposalReady,
            ])
        } else {
            None
        };

        let query = ai_quick_upload_queries::get_quick_uploads(GetQuickUploadsParams::all(
            user_id,
            status_filter,
            0,
            50,
        ));
        let models: Vec<QuickUploadModel> = self.db.fetch_all(query).await?;
        Ok(models.into_iter().map_into().collect())
    }

    pub async fn subscribe(&self, quick_upload_id: Uuid) -> broadcast::Receiver<PgNotifyEvent> {
        let entity_id = quick_upload_id.to_string();
        self.pg_notify.subscribe(&entity_id).await
    }

    pub async fn notify(
        &self,
        quick_upload_id: Uuid,
        event: QuickUploadNotification,
    ) -> anyhow::Result<()> {
        let entity_id = quick_upload_id.to_string();
        self.pg_notify.notify(&entity_id, &event).await?;
        Ok(())
    }

    pub async fn update_status(
        &self,
        quick_upload_id: Uuid,
        status: QuickUploadStatus,
    ) -> anyhow::Result<()> {
        let query = ai_quick_upload_queries::update_quick_upload_status(quick_upload_id, status);
        self.db.execute(query).await?;
        Ok(())
    }

    pub async fn set_proposal(
        &self,
        quick_upload_id: Uuid,
        proposal_type: ProposalType,
        proposal_data: serde_json::Value,
    ) -> anyhow::Result<()> {
        let query = ai_quick_upload_queries::update_quick_upload_proposal(
            quick_upload_id,
            proposal_type.to_string(),
            proposal_data,
        );
        self.db.execute(query).await?;
        Ok(())
    }

    pub async fn complete(
        &self,
        quick_upload_id: Uuid,
        user_id: Uuid,
        accepted: bool,
    ) -> anyhow::Result<()> {
        self.get_quick_upload(quick_upload_id, user_id).await?;
        let status = if accepted {
            QuickUploadStatus::Accepted
        } else {
            QuickUploadStatus::Rejected
        };
        self.update_status(quick_upload_id, status).await?;
        Ok(())
    }

    pub async fn enqueue_correction(
        &self,
        quick_upload_id: Uuid,
        user_id: Uuid,
        message: String,
    ) -> anyhow::Result<()> {
        self.get_quick_upload(quick_upload_id, user_id).await?;

        self.update_status(quick_upload_id, QuickUploadStatus::Processing)
            .await?;

        self.queue
            .push(MyraJob::ProcessQuickUploadCorrection {
                quick_upload_id,
                user_id,
                message,
            })
            .await?;

        Ok(())
    }
}
