use anyhow::Result;
use uuid::Uuid;

use crate::models::action::{
    CreateTransactionGroupParams, CreateTransactionGroupResult, CreateTransactionParams,
    CreateTransactionResult,
};

pub trait AiActionProvider: Send + Sync + 'static {
    fn create_transaction(
        &self,
        user_id: Uuid,
        params: CreateTransactionParams,
    ) -> impl std::future::Future<Output = Result<CreateTransactionResult>> + Send;

    fn create_transaction_group(
        &self,
        user_id: Uuid,
        params: CreateTransactionGroupParams,
    ) -> impl std::future::Future<Output = Result<CreateTransactionGroupResult>> + Send;
}
