use anyhow::Result;

use crate::models::action::{
    CreateTransactionGroupParams, CreateTransactionGroupResult, CreateTransactionParams,
    CreateTransactionResult,
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
}
