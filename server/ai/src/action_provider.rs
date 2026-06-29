use anyhow::Result;

use crate::models::action::{
    CreateCustomAssetParams, CreateCustomAssetResult, CreateTransactionParams,
    CreateTransactionResult, DeleteTransactionParams, DeleteTransactionResult,
    GroupTransactionsParams, GroupTransactionsResult, RecordAssetSwapParams, RecordAssetSwapResult,
    RecordAssetTradeParams, RecordAssetTradeResult, RecordAssetTransferParams,
    RecordAssetTransferResult, RecordCashTransferParams, RecordCashTransferResult,
    RecordDividendParams, RecordDividendResult, RecordFeeParams, RecordFeeResult,
    RecordTransferParams, RecordTransferResult, UpdateAssetValuationParams,
    UpdateAssetValuationResult, UpdateTransactionParams, UpdateTransactionResult,
};

/// Mutating operations available to AI tools. Implementers are user-scoped —
/// the user identity is captured at construction, so trait methods don't
/// take a `user_id` parameter.
pub trait AiActionProvider: Send + Sync + 'static {
    fn create_transaction(
        &self,
        params: CreateTransactionParams,
    ) -> impl std::future::Future<Output = Result<CreateTransactionResult>> + Send;

    fn group_transactions(
        &self,
        params: GroupTransactionsParams,
    ) -> impl std::future::Future<Output = Result<GroupTransactionsResult>> + Send;

    fn create_custom_asset(
        &self,
        params: CreateCustomAssetParams,
    ) -> impl std::future::Future<Output = Result<CreateCustomAssetResult>> + Send;

    fn record_asset_trade(
        &self,
        params: RecordAssetTradeParams,
    ) -> impl std::future::Future<Output = Result<RecordAssetTradeResult>> + Send;

    fn record_transfer(
        &self,
        params: RecordTransferParams,
    ) -> impl std::future::Future<Output = Result<RecordTransferResult>> + Send;

    fn record_cash_transfer(
        &self,
        params: RecordCashTransferParams,
    ) -> impl std::future::Future<Output = Result<RecordCashTransferResult>> + Send;

    fn record_asset_transfer(
        &self,
        params: RecordAssetTransferParams,
    ) -> impl std::future::Future<Output = Result<RecordAssetTransferResult>> + Send;

    fn record_asset_swap(
        &self,
        params: RecordAssetSwapParams,
    ) -> impl std::future::Future<Output = Result<RecordAssetSwapResult>> + Send;

    fn update_asset_valuation(
        &self,
        params: UpdateAssetValuationParams,
    ) -> impl std::future::Future<Output = Result<UpdateAssetValuationResult>> + Send;

    fn record_dividend(
        &self,
        params: RecordDividendParams,
    ) -> impl std::future::Future<Output = Result<RecordDividendResult>> + Send;

    fn record_fee(
        &self,
        params: RecordFeeParams,
    ) -> impl std::future::Future<Output = Result<RecordFeeResult>> + Send;

    fn update_transaction(
        &self,
        params: UpdateTransactionParams,
    ) -> impl std::future::Future<Output = Result<UpdateTransactionResult>> + Send;

    fn delete_transaction(
        &self,
        params: DeleteTransactionParams,
    ) -> impl std::future::Future<Output = Result<DeleteTransactionResult>> + Send;
}
