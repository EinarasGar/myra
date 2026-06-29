use anyhow::Result;
use uuid::Uuid;

use crate::models::account::AccountResult;
use crate::models::aggregate::{AggregateParams, AggregateResult};
use crate::models::reference::{AssetResult, CategoryResult};
use crate::models::transactions::{
    QueryTransactionsParams, QueryTransactionsResult, TransactionDetailResult,
};
use crate::models::wealth::{
    AssetPriceResult, HoldingsResult, NetWorthHistoryResult, PortfolioOverviewResult,
};

/// Read-only data access for AI tools. Implementers are user-scoped — the
/// user identity is captured at construction (in the implementing struct's
/// fields), so trait methods don't take a `user_id` parameter.
pub trait AiDataProvider: Send + Sync + 'static {
    fn query_transactions(
        &self,
        params: QueryTransactionsParams,
        query_vector: Option<Vec<f64>>,
    ) -> impl std::future::Future<Output = Result<QueryTransactionsResult>> + Send;

    fn aggregate_transactions(
        &self,
        params: &AggregateParams,
    ) -> impl std::future::Future<Output = Result<AggregateResult>> + Send;

    fn get_transaction_detail(
        &self,
        transaction_id: Uuid,
    ) -> impl std::future::Future<Output = Result<TransactionDetailResult>> + Send;

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

    fn get_holdings(
        &self,
        account_id: Option<Uuid>,
        asset_id: Option<i32>,
        group_by: Option<String>,
        summary: bool,
        reference_asset_id: Option<i32>,
    ) -> impl std::future::Future<Output = Result<HoldingsResult>> + Send;

    fn get_net_worth_history(
        &self,
        range: String,
        account_id: Option<Uuid>,
        reference_asset_id: Option<i32>,
    ) -> impl std::future::Future<Output = Result<NetWorthHistoryResult>> + Send;

    fn get_portfolio_overview(
        &self,
        account_id: Option<Uuid>,
        asset_id: Option<i32>,
        include_positions: bool,
        reference_asset_id: Option<i32>,
    ) -> impl std::future::Future<Output = Result<PortfolioOverviewResult>> + Send;

    fn get_asset_price(
        &self,
        asset_id: i32,
        quote_asset_id: Option<i32>,
        range: Option<String>,
        date_from: Option<String>,
        date_to: Option<String>,
    ) -> impl std::future::Future<Output = Result<AssetPriceResult>> + Send;
}
