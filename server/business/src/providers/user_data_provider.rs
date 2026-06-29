//! Per-user adapter that implements the ai crate's `AiDataProvider`.
//! Bundles the shared `AiDataService` with a user identity so trait methods
//! don't need to take `user_id` per call.

use ai::data_provider::AiDataProvider;
use ai::models::account::AccountResult;
use ai::models::aggregate::{AggregateParams, AggregateResult};
use ai::models::reference::{AssetResult, CategoryResult};
use ai::models::transactions::{
    QueryTransactionsParams, QueryTransactionsResult, TransactionDetailResult,
};
use ai::models::wealth::{
    AssetPriceResult, HoldingsResult, NetWorthHistoryResult, PortfolioOverviewResult,
};
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
    async fn query_transactions(
        &self,
        params: QueryTransactionsParams,
        query_vector: Option<Vec<f64>>,
    ) -> Result<QueryTransactionsResult> {
        self.service
            .query_transactions(self.user_id, params, query_vector)
            .await
    }

    async fn aggregate_transactions(&self, params: &AggregateParams) -> Result<AggregateResult> {
        self.service
            .aggregate_transactions(
                self.user_id,
                &params.group_by,
                params.date_from.as_deref(),
                params.date_to.as_deref(),
                params.description_filter.as_deref(),
                params.account_id,
                params.currency_asset_id,
                params.limit,
            )
            .await
    }

    async fn get_transaction_detail(
        &self,
        transaction_id: Uuid,
    ) -> Result<TransactionDetailResult> {
        self.service
            .get_transaction_detail(self.user_id, transaction_id)
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

    async fn get_holdings(
        &self,
        account_id: Option<Uuid>,
        asset_id: Option<i32>,
        group_by: Option<String>,
        summary: bool,
        reference_asset_id: Option<i32>,
    ) -> Result<HoldingsResult> {
        self.service
            .get_holdings(
                self.user_id,
                account_id,
                asset_id,
                group_by,
                summary,
                reference_asset_id,
            )
            .await
    }

    async fn get_net_worth_history(
        &self,
        range: String,
        account_id: Option<Uuid>,
        reference_asset_id: Option<i32>,
    ) -> Result<NetWorthHistoryResult> {
        self.service
            .get_net_worth_history(self.user_id, range, account_id, reference_asset_id)
            .await
    }

    async fn get_portfolio_overview(
        &self,
        account_id: Option<Uuid>,
        asset_id: Option<i32>,
        include_positions: bool,
        reference_asset_id: Option<i32>,
    ) -> Result<PortfolioOverviewResult> {
        self.service
            .get_portfolio_overview(
                self.user_id,
                account_id,
                asset_id,
                include_positions,
                reference_asset_id,
            )
            .await
    }

    async fn get_asset_price(
        &self,
        asset_id: i32,
        quote_asset_id: Option<i32>,
        range: Option<String>,
        date_from: Option<String>,
        date_to: Option<String>,
    ) -> Result<AssetPriceResult> {
        self.service
            .get_asset_price(
                self.user_id,
                asset_id,
                quote_asset_id,
                range,
                date_from,
                date_to,
            )
            .await
    }
}
