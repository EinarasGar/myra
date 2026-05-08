//! Stateless data-access service used by AI tools (via the user-scoped
//! adapter in `providers::user_data_provider`). Methods take `user_id`
//! explicitly because `AiDataService` itself is shared across users; the
//! per-user `AiDataProvider` impl lives in the providers module.

use ai::models::account::AccountResult;
use ai::models::aggregate::AggregateGroupResult;
use ai::models::reference::{AssetResult, CategoryResult};
use ai::models::search::TransactionSearchResult;
use anyhow::Result;
#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::models::ai_models::{AiAssetModel, AiCategoryModel, AiTransactionSearchModel};
use dal::queries::ai_queries;
use dal::query_params::ai_search_params;
use pgvector::Vector;
use uuid::Uuid;

pub struct AiDataService {
    db: MyraDb,
}

impl AiDataService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            db: providers.db.clone(),
        }
    }

    pub async fn search_transactions_by_text(
        &self,
        user_id: Uuid,
        query: &str,
        date_from: Option<&str>,
        date_to: Option<&str>,
        limit: i64,
    ) -> Result<Vec<TransactionSearchResult>> {
        let dal_params = ai_search_params::SearchTransactionsParams {
            user_id,
            query: query.to_string(),
            date_from: date_from.map(str::to_string),
            date_to: date_to.map(str::to_string),
            limit,
        };
        let q = ai_queries::search_transactions_by_description(&dal_params);
        let rows = self.db.fetch_all::<AiTransactionSearchModel>(q).await?;
        Ok(rows.into_iter().map(to_search_result).collect())
    }

    pub async fn search_transactions_by_vector(
        &self,
        user_id: Uuid,
        query_vector: Vec<f64>,
        date_from: Option<&str>,
        date_to: Option<&str>,
        limit: i64,
    ) -> Result<Vec<TransactionSearchResult>> {
        let vector = Vector::from(query_vector.iter().map(|&x| x as f32).collect::<Vec<f32>>());
        let q = ai_queries::search_transactions_by_embedding(
            user_id, vector, date_from, date_to, limit,
        );
        let rows = self.db.fetch_all::<AiTransactionSearchModel>(q).await?;
        Ok(rows.into_iter().map(to_search_result).collect())
    }

    pub async fn count_transactions_by_text(
        &self,
        user_id: Uuid,
        query: &str,
        date_from: Option<&str>,
        date_to: Option<&str>,
        limit: i64,
    ) -> Result<i64> {
        let dal_params = ai_search_params::SearchTransactionsParams {
            user_id,
            query: query.to_string(),
            date_from: date_from.map(str::to_string),
            date_to: date_to.map(str::to_string),
            limit,
        };
        let q = ai_queries::count_transactions_by_description(&dal_params);
        let count = self.db.fetch_one_scalar::<i64>(q).await?;
        Ok(count)
    }

    pub async fn aggregate_transactions(
        &self,
        user_id: Uuid,
        group_by: &str,
        date_from: Option<&str>,
        date_to: Option<&str>,
        description_filter: Option<&str>,
    ) -> Result<Vec<AggregateGroupResult>> {
        let dal_params = ai_search_params::AggregateTransactionsParams {
            user_id,
            group_by: group_by.to_string(),
            date_from: date_from.map(str::to_string),
            date_to: date_to.map(str::to_string),
            description_filter: description_filter.map(str::to_string),
        };
        let q = ai_queries::aggregate_transactions(&dal_params);
        let rows = self
            .db
            .fetch_all::<(String, rust_decimal::Decimal, i64)>(q)
            .await?;
        Ok(rows
            .into_iter()
            .map(|(name, amount, count)| AggregateGroupResult {
                group_name: name,
                total_amount: amount,
                transaction_count: count,
            })
            .collect())
    }

    pub async fn list_accounts(&self, user_id: Uuid) -> Result<Vec<AccountResult>> {
        let dal_params = ai_search_params::ListAccountsParams { user_id };
        let q = ai_queries::get_active_accounts(&dal_params);
        let rows = self
            .db
            .fetch_all::<dal::models::ai_models::AiAccountModel>(q)
            .await?;
        Ok(rows
            .into_iter()
            .map(|r| AccountResult {
                account_id: r.account_id,
                account_name: r.account_name,
                account_type: r.account_type,
                liquidity_type: r.liquidity_type,
            })
            .collect())
    }

    pub async fn search_categories(
        &self,
        user_id: Uuid,
        query_vector: Option<Vec<f64>>,
    ) -> Result<Vec<CategoryResult>> {
        let embedding =
            query_vector.map(|qv| Vector::from(qv.iter().map(|&x| x as f32).collect::<Vec<f32>>()));
        let params = ai_search_params::SearchCategoriesParams {
            user_id,
            limit: embedding.as_ref().map(|_| 20_i64),
            embedding,
        };
        let rows = self
            .db
            .fetch_all::<AiCategoryModel>(ai_queries::search_categories(&params))
            .await?;
        Ok(rows.into_iter().map(to_category_result).collect())
    }

    pub async fn search_assets(
        &self,
        user_id: Uuid,
        query: Option<&str>,
        query_vector: Option<Vec<f64>>,
    ) -> Result<Vec<AssetResult>> {
        let embedding =
            query_vector.map(|qv| Vector::from(qv.iter().map(|&x| x as f32).collect::<Vec<f32>>()));
        let params = ai_search_params::SearchAssetsParams {
            user_id,
            query: query.map(|s| s.to_string()),
            limit: embedding.as_ref().map(|_| 20_i64),
            embedding,
        };
        let rows = self
            .db
            .fetch_all::<AiAssetModel>(ai_queries::search_assets(&params))
            .await?;
        Ok(rows.into_iter().map(to_asset_result).collect())
    }
}

fn to_category_result(r: AiCategoryModel) -> CategoryResult {
    CategoryResult {
        id: r.id,
        category: r.category,
        category_type: r.category_type,
        icon: r.icon,
    }
}

fn to_asset_result(r: AiAssetModel) -> AssetResult {
    AssetResult {
        id: r.id,
        asset_name: r.asset_name,
        ticker: r.ticker,
        asset_type: r.asset_type,
    }
}

fn to_search_result(m: AiTransactionSearchModel) -> TransactionSearchResult {
    TransactionSearchResult {
        transaction_id: m.transaction_id,
        description: m.description,
        date_transacted: m.date_transacted,
        quantity: m.quantity,
        asset_name: m.asset_name,
        account_name: m.account_name,
    }
}
