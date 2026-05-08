//! Per-user adapter that implements the ai crate's `AiActionProvider`.
//! Bundles the shared `AiActionService` with a user identity so trait
//! methods don't need to take `user_id` per call.

use ai::action_provider::AiActionProvider;
use ai::models::action::{
    CreateTransactionGroupParams, CreateTransactionGroupResult, CreateTransactionParams,
    CreateTransactionResult,
};
use anyhow::Result;
use uuid::Uuid;

use crate::service_collection::ai_action_service::AiActionService;

pub struct UserActionProvider {
    service: AiActionService,
    user_id: Uuid,
}

impl UserActionProvider {
    pub fn new(service: AiActionService, user_id: Uuid) -> Self {
        Self { service, user_id }
    }
}

impl AiActionProvider for UserActionProvider {
    async fn create_transaction(
        &self,
        params: CreateTransactionParams,
    ) -> Result<CreateTransactionResult> {
        self.service.create_transaction(self.user_id, params).await
    }

    async fn create_transaction_group(
        &self,
        params: CreateTransactionGroupParams,
    ) -> Result<CreateTransactionGroupResult> {
        self.service
            .create_transaction_group(self.user_id, params)
            .await
    }
}
