use anyhow::Result;

use crate::models::account::AccountResult;
use crate::models::aggregate::{AggregateGroupResult, AggregateParams};
use crate::models::reference::{AssetResult, CategoryResult};
use crate::models::search::{SearchParams, TransactionSearchResult};

/// Read-only data access for AI tools. Implementers are user-scoped — the
/// user identity is captured at construction (in the implementing struct's
/// fields), so trait methods don't take a `user_id` parameter.
pub trait AiDataProvider: Send + Sync + 'static {
    fn search_transactions_by_text(
        &self,
        params: &SearchParams,
    ) -> impl std::future::Future<Output = Result<Vec<TransactionSearchResult>>> + Send;

    fn search_transactions_by_vector(
        &self,
        query_vector: Vec<f64>,
        date_from: Option<&str>,
        date_to: Option<&str>,
        limit: i64,
    ) -> impl std::future::Future<Output = Result<Vec<TransactionSearchResult>>> + Send;

    fn count_transactions_by_text(
        &self,
        params: &SearchParams,
    ) -> impl std::future::Future<Output = Result<i64>> + Send;

    fn aggregate_transactions(
        &self,
        params: &AggregateParams,
    ) -> impl std::future::Future<Output = Result<Vec<AggregateGroupResult>>> + Send;

    fn list_accounts(&self)
        -> impl std::future::Future<Output = Result<Vec<AccountResult>>> + Send;

    fn search_categories(
        &self,
        query_vector: Option<Vec<f64>>,
    ) -> impl std::future::Future<Output = Result<Vec<CategoryResult>>> + Send;

    fn search_assets(
        &self,
        query: Option<&str>,
        query_vector: Option<Vec<f64>>,
    ) -> impl std::future::Future<Output = Result<Vec<AssetResult>>> + Send;
}
