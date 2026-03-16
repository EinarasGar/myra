use ai::data_provider::AiDataProvider;
use ai::models::account::AccountResult;
use ai::models::aggregate::{AggregateGroupResult, AggregateParams};
use ai::models::search::{SearchParams, TransactionSearchResult};
use anyhow::Result;
use dal::database_context::MyraDb;
use dal::models::ai_models::AiTransactionSearchModel;
use dal::queries::ai_queries;
use dal::query_params::ai_search_params;
use pgvector::Vector;
use uuid::Uuid;

pub struct AiDataService {
    db: MyraDb,
}

impl AiDataService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }
}

impl AiDataProvider for AiDataService {
    async fn search_transactions_by_text(
        &self,
        params: &SearchParams,
    ) -> Result<Vec<TransactionSearchResult>> {
        let dal_params = to_dal_search_params(params);
        let query = ai_queries::search_transactions_by_description(&dal_params);
        let rows = self.db.fetch_all::<AiTransactionSearchModel>(query).await?;
        Ok(rows.into_iter().map(to_search_result).collect())
    }

    async fn search_transactions_by_vector(
        &self,
        user_id: Uuid,
        query_vector: Vec<f64>,
        date_from: Option<&str>,
        date_to: Option<&str>,
        limit: i64,
    ) -> Result<Vec<TransactionSearchResult>> {
        let vector = Vector::from(query_vector.iter().map(|&x| x as f32).collect::<Vec<f32>>());
        let query = ai_queries::search_transactions_by_embedding(
            user_id, vector, date_from, date_to, limit,
        );
        let rows = self.db.fetch_all::<AiTransactionSearchModel>(query).await?;
        Ok(rows.into_iter().map(to_search_result).collect())
    }

    async fn count_transactions_by_text(&self, params: &SearchParams) -> Result<i64> {
        let dal_params = to_dal_search_params(params);
        let query = ai_queries::count_transactions_by_description(&dal_params);
        let count = self.db.fetch_one_scalar::<i64>(query).await?;
        Ok(count)
    }

    async fn aggregate_transactions(
        &self,
        params: &AggregateParams,
    ) -> Result<Vec<AggregateGroupResult>> {
        let dal_params = ai_search_params::AggregateTransactionsParams {
            user_id: params.user_id,
            group_by: params.group_by.clone(),
            date_from: params.date_from.clone(),
            date_to: params.date_to.clone(),
            description_filter: params.description_filter.clone(),
        };
        let query = ai_queries::aggregate_transactions(&dal_params);
        let rows = self
            .db
            .fetch_all::<(String, rust_decimal::Decimal, i64)>(query)
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

    async fn list_accounts(&self, user_id: Uuid) -> Result<Vec<AccountResult>> {
        let dal_params = ai_search_params::ListAccountsParams { user_id };
        let query = ai_queries::get_active_accounts(&dal_params);
        let rows = self
            .db
            .fetch_all::<dal::models::ai_models::AiAccountModel>(query)
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
}

fn to_dal_search_params(params: &SearchParams) -> ai_search_params::SearchTransactionsParams {
    ai_search_params::SearchTransactionsParams {
        user_id: params.user_id,
        query: params.query.clone(),
        date_from: params.date_from.clone(),
        date_to: params.date_to.clone(),
        limit: params.limit,
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
