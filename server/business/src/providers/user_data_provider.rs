//! Per-user adapter that implements the ai crate's `AiDataProvider`.
//! Bundles the shared `AiDataService` with a user identity so trait methods
//! don't need to take `user_id` per call.

use ai::data_provider::AiDataProvider;
use ai::models::account::AccountResult;
use ai::models::aggregate::{AggregateGroupResult, AggregateParams};
use ai::models::reference::{AssetResult, CategoryResult};
use ai::models::search::{SearchParams, TransactionSearchResult};
use anyhow::Result;
use uuid::Uuid;

use crate::service_collection::ai_data_service::AiDataService;

pub struct UserDataProvider {
    service: AiDataService,
    user_id: Uuid,
}

impl UserDataProvider {
    pub fn new(service: AiDataService, user_id: Uuid) -> Self {
        Self { service, user_id }
    }
}

impl AiDataProvider for UserDataProvider {
    async fn search_transactions_by_text(
        &self,
        params: &SearchParams,
    ) -> Result<Vec<TransactionSearchResult>> {
        self.service
            .search_transactions_by_text(
                self.user_id,
                &params.query,
                params.date_from.as_deref(),
                params.date_to.as_deref(),
                params.limit,
            )
            .await
    }

    async fn search_transactions_by_vector(
        &self,
        query_vector: Vec<f64>,
        date_from: Option<&str>,
        date_to: Option<&str>,
        limit: i64,
    ) -> Result<Vec<TransactionSearchResult>> {
        self.service
            .search_transactions_by_vector(self.user_id, query_vector, date_from, date_to, limit)
            .await
    }

    async fn count_transactions_by_text(&self, params: &SearchParams) -> Result<i64> {
        self.service
            .count_transactions_by_text(
                self.user_id,
                &params.query,
                params.date_from.as_deref(),
                params.date_to.as_deref(),
                params.limit,
            )
            .await
    }

    async fn aggregate_transactions(
        &self,
        params: &AggregateParams,
    ) -> Result<Vec<AggregateGroupResult>> {
        self.service
            .aggregate_transactions(
                self.user_id,
                &params.group_by,
                params.date_from.as_deref(),
                params.date_to.as_deref(),
                params.description_filter.as_deref(),
            )
            .await
    }

    async fn list_accounts(&self) -> Result<Vec<AccountResult>> {
        self.service.list_accounts(self.user_id).await
    }

    async fn search_categories(
        &self,
        query_vector: Option<Vec<f64>>,
    ) -> Result<Vec<CategoryResult>> {
        self.service
            .search_categories(self.user_id, query_vector)
            .await
    }

    async fn search_assets(
        &self,
        query: Option<&str>,
        query_vector: Option<Vec<f64>>,
    ) -> Result<Vec<AssetResult>> {
        self.service
            .search_assets(self.user_id, query, query_vector)
            .await
    }
}
