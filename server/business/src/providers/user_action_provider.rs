//! Per-user adapter that implements the ai crate's `AiActionProvider`.
//! Bundles the shared `AiActionService` with a user identity so trait
//! methods don't need to take `user_id` per call.

use ai::action_provider::AiActionProvider;
use ai::models::action::{
    CreateCustomAssetParams, CreateCustomAssetResult, CreateTransactionParams,
    CreateTransactionResult, DeleteTransactionParams, DeleteTransactionResult,
    GroupTransactionsParams, GroupTransactionsResult, RecordAssetSwapParams, RecordAssetSwapResult,
    RecordAssetTradeParams, RecordAssetTradeResult, RecordAssetTransferParams,
    RecordAssetTransferResult, RecordCashTransferParams, RecordCashTransferResult,
    RecordDividendParams, RecordDividendResult, RecordFeeParams, RecordFeeResult,
    RecordTransferParams, RecordTransferResult, UpdateAssetValuationParams,
    UpdateAssetValuationResult, UpdateTransactionParams, UpdateTransactionResult,
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

    async fn group_transactions(
        &self,
        params: GroupTransactionsParams,
    ) -> Result<GroupTransactionsResult> {
        self.service.group_transactions(self.user_id, params).await
    }

    async fn create_custom_asset(
        &self,
        params: CreateCustomAssetParams,
    ) -> Result<CreateCustomAssetResult> {
        self.service.create_custom_asset(self.user_id, params).await
    }

    async fn record_asset_trade(
        &self,
        params: RecordAssetTradeParams,
    ) -> Result<RecordAssetTradeResult> {
        self.service.record_asset_trade(self.user_id, params).await
    }

    async fn record_transfer(&self, params: RecordTransferParams) -> Result<RecordTransferResult> {
        self.service.record_transfer(self.user_id, params).await
    }

    async fn record_cash_transfer(
        &self,
        params: RecordCashTransferParams,
    ) -> Result<RecordCashTransferResult> {
        self.service
            .record_cash_transfer(self.user_id, params)
            .await
    }

    async fn record_asset_transfer(
        &self,
        params: RecordAssetTransferParams,
    ) -> Result<RecordAssetTransferResult> {
        self.service
            .record_asset_transfer(self.user_id, params)
            .await
    }

    async fn record_asset_swap(
        &self,
        params: RecordAssetSwapParams,
    ) -> Result<RecordAssetSwapResult> {
        self.service.record_asset_swap(self.user_id, params).await
    }

    async fn update_asset_valuation(
        &self,
        params: UpdateAssetValuationParams,
    ) -> Result<UpdateAssetValuationResult> {
        self.service
            .update_asset_valuation(self.user_id, params)
            .await
    }

    async fn record_dividend(&self, params: RecordDividendParams) -> Result<RecordDividendResult> {
        self.service.record_dividend(self.user_id, params).await
    }

    async fn record_fee(&self, params: RecordFeeParams) -> Result<RecordFeeResult> {
        self.service.record_fee(self.user_id, params).await
    }

    async fn update_transaction(
        &self,
        params: UpdateTransactionParams,
    ) -> Result<UpdateTransactionResult> {
        self.service.update_transaction(self.user_id, params).await
    }

    async fn delete_transaction(
        &self,
        params: DeleteTransactionParams,
    ) -> Result<DeleteTransactionResult> {
        self.service.delete_transaction(self.user_id, params).await
    }
}
