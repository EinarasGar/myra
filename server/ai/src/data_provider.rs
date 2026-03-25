use anyhow::Result;
use uuid::Uuid;

use crate::models::account::AccountResult;
use crate::models::aggregate::{AggregateGroupResult, AggregateParams};
use crate::models::reference::{AssetResult, CategoryResult};
use crate::models::search::{SearchParams, TransactionSearchResult};

pub trait AiDataProvider: Send + Sync + 'static {
    fn search_transactions_by_text(
        &self,
        params: &SearchParams,
    ) -> impl std::future::Future<Output = Result<Vec<TransactionSearchResult>>> + Send;

    fn search_transactions_by_vector(
        &self,
        user_id: Uuid,
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

    fn list_accounts(
        &self,
        user_id: Uuid,
    ) -> impl std::future::Future<Output = Result<Vec<AccountResult>>> + Send;

    fn search_categories(
        &self,
        user_id: Uuid,
        query_vector: Option<Vec<f64>>,
    ) -> impl std::future::Future<Output = Result<Vec<CategoryResult>>> + Send;

    fn search_assets(
        &self,
        user_id: Uuid,
        query: Option<&str>,
        query_vector: Option<Vec<f64>>,
    ) -> impl std::future::Future<Output = Result<Vec<AssetResult>>> + Send;
}
