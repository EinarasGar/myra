use anyhow::Result;

use crate::models::action::{
    CreateCustomAssetParams, CreateCustomAssetResult, CreateTransactionGroupParams,
    CreateTransactionGroupResult, CreateTransactionParams, CreateTransactionResult,
    RecordAssetTradeParams, RecordAssetTradeResult,
};

/// Mutating operations available to AI tools. Implementers are user-scoped —
/// the user identity is captured at construction, so trait methods don't
/// take a `user_id` parameter.
pub trait AiActionProvider: Send + Sync + 'static {
    fn create_transaction(
        &self,
        params: CreateTransactionParams,
    ) -> impl std::future::Future<Output = Result<CreateTransactionResult>> + Send;

    fn create_transaction_group(
        &self,
        params: CreateTransactionGroupParams,
    ) -> impl std::future::Future<Output = Result<CreateTransactionGroupResult>> + Send;

    fn create_custom_asset(
        &self,
        params: CreateCustomAssetParams,
    ) -> impl std::future::Future<Output = Result<CreateCustomAssetResult>> + Send;

    fn record_asset_trade(
        &self,
        params: RecordAssetTradeParams,
    ) -> impl std::future::Future<Output = Result<RecordAssetTradeResult>> + Send;
}
