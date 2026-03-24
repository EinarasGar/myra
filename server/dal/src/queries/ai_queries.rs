use pgvector::Vector;
use sea_query::extension::postgres::{PgBinOper, PgExpr};
use sea_query::*;
use sea_query_sqlx::SqlxBinder;
use uuid::Uuid;

use crate::idens::account_idens::{AccountIden, AccountLiquidityTypesIden, AccountTypesIden};
use crate::idens::asset_idens::AssetsIden;
use crate::idens::entries_idens::EntryIden;
use crate::idens::transaction_idens::{
    TransactionCategoriesIden, TransactionDescriptionsIden, TransactionGroupIden, TransactionIden,
};
use crate::query_params::ai_search_params::{
    AggregateTransactionsParams, ListAccountsParams, SearchTransactionsParams,
};

use super::{escape_ilike_pattern, DbQueryWithValues};

#[tracing::instrument(skip_all)]
pub fn search_transactions_by_description(params: &SearchTransactionsParams) -> DbQueryWithValues {
    let pattern = escape_ilike_pattern(&params.query);

    let mut query = Query::select();
    query
        .expr_as(
            Expr::col((TransactionIden::Table, TransactionIden::Id)),
            Alias::new("transaction_id"),
        )
        .column((
            TransactionDescriptionsIden::Table,
            TransactionDescriptionsIden::Description,
        ))
        .column((TransactionIden::Table, TransactionIden::DateTransacted))
        .expr_as(
            Expr::cust("SUM(\"entry\".\"quantity\")"),
            Alias::new("quantity"),
        )
        .expr_as(
            Expr::cust("(array_agg(DISTINCT \"assets\".\"asset_name\"))[1]"),
            Alias::new("asset_name"),
        )
        .expr_as(
            Expr::cust("(array_agg(DISTINCT \"account\".\"account_name\"))[1]"),
            Alias::new("account_name"),
        )
        .from(TransactionIden::Table)
        .inner_join(
            TransactionDescriptionsIden::Table,
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::TransactionId,
            ))
            .equals((TransactionIden::Table, TransactionIden::Id)),
        )
        .inner_join(
            EntryIden::Table,
            Expr::col((EntryIden::Table, EntryIden::TransactionId))
                .equals((TransactionIden::Table, TransactionIden::Id)),
        )
        .inner_join(
            AssetsIden::Table,
            Expr::col((AssetsIden::Table, AssetsIden::Id))
                .equals((EntryIden::Table, EntryIden::AssetId)),
        )
        .inner_join(
            AccountIden::Table,
            Expr::col((AccountIden::Table, AccountIden::Id))
                .equals((EntryIden::Table, EntryIden::AccountId)),
        )
        .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(params.user_id))
        .and_where(
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::Description,
            ))
            .ilike(&pattern),
        )
        .group_by_col((TransactionIden::Table, TransactionIden::Id))
        .group_by_col((
            TransactionDescriptionsIden::Table,
            TransactionDescriptionsIden::Description,
        ))
        .group_by_col((TransactionIden::Table, TransactionIden::DateTransacted))
        .order_by(
            (TransactionIden::Table, TransactionIden::DateTransacted),
            Order::Desc,
        )
        .limit(params.limit as u64);

    if let Some(ref date_from) = params.date_from {
        query.and_where(
            Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)).gte(
                Expr::cust_with_values("$1::timestamptz", [date_from.as_str()]),
            ),
        );
    }
    if let Some(ref date_to) = params.date_to {
        query.and_where(
            Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)).lte(
                Expr::cust_with_values("$1::timestamptz", [date_to.as_str()]),
            ),
        );
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn count_transactions_by_description(params: &SearchTransactionsParams) -> DbQueryWithValues {
    let pattern = escape_ilike_pattern(&params.query);

    let mut query = Query::select();
    query
        .expr(Expr::cust("COUNT(DISTINCT \"transaction\".\"id\")"))
        .from(TransactionIden::Table)
        .inner_join(
            TransactionDescriptionsIden::Table,
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::TransactionId,
            ))
            .equals((TransactionIden::Table, TransactionIden::Id)),
        )
        .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(params.user_id))
        .and_where(
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::Description,
            ))
            .ilike(&pattern),
        );

    if let Some(ref date_from) = params.date_from {
        query.and_where(
            Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)).gte(
                Expr::cust_with_values("$1::timestamptz", [date_from.as_str()]),
            ),
        );
    }
    if let Some(ref date_to) = params.date_to {
        query.and_where(
            Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)).lte(
                Expr::cust_with_values("$1::timestamptz", [date_to.as_str()]),
            ),
        );
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn search_transactions_by_embedding(
    user_id: Uuid,
    query_vector: Vector,
    date_from: Option<&str>,
    date_to: Option<&str>,
    limit: i64,
) -> DbQueryWithValues {
    let mut query = Query::select();
    query
        .expr_as(
            Expr::col((TransactionIden::Table, TransactionIden::Id)),
            Alias::new("transaction_id"),
        )
        .column((
            TransactionDescriptionsIden::Table,
            TransactionDescriptionsIden::Description,
        ))
        .column((TransactionIden::Table, TransactionIden::DateTransacted))
        .expr_as(
            Expr::cust("SUM(\"entry\".\"quantity\")"),
            Alias::new("quantity"),
        )
        .expr_as(
            Expr::cust("(array_agg(DISTINCT \"assets\".\"asset_name\"))[1]"),
            Alias::new("asset_name"),
        )
        .expr_as(
            Expr::cust("(array_agg(DISTINCT \"account\".\"account_name\"))[1]"),
            Alias::new("account_name"),
        )
        .from(TransactionIden::Table)
        .inner_join(
            TransactionDescriptionsIden::Table,
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::TransactionId,
            ))
            .equals((TransactionIden::Table, TransactionIden::Id)),
        )
        .inner_join(
            EntryIden::Table,
            Expr::col((EntryIden::Table, EntryIden::TransactionId))
                .equals((TransactionIden::Table, TransactionIden::Id)),
        )
        .inner_join(
            AssetsIden::Table,
            Expr::col((AssetsIden::Table, AssetsIden::Id))
                .equals((EntryIden::Table, EntryIden::AssetId)),
        )
        .inner_join(
            AccountIden::Table,
            Expr::col((AccountIden::Table, AccountIden::Id))
                .equals((EntryIden::Table, EntryIden::AccountId)),
        )
        .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(user_id))
        .and_where(
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::Embedding,
            ))
            .is_not_null(),
        )
        .group_by_col((TransactionIden::Table, TransactionIden::Id))
        .group_by_col((
            TransactionDescriptionsIden::Table,
            TransactionDescriptionsIden::Description,
        ))
        .group_by_col((TransactionIden::Table, TransactionIden::DateTransacted))
        .group_by_col((
            TransactionDescriptionsIden::Table,
            TransactionDescriptionsIden::Embedding,
        ))
        .order_by_expr(
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::Embedding,
            ))
            .binary(PgBinOper::CosineDistance, Expr::val(query_vector)),
            Order::Asc,
        )
        .limit(limit as u64);

    if let Some(date_from) = date_from {
        query.and_where(
            Expr::col((TransactionIden::Table, TransactionIden::DateTransacted))
                .gte(Expr::cust_with_values("$1::timestamptz", [date_from])),
        );
    }
    if let Some(date_to) = date_to {
        query.and_where(
            Expr::col((TransactionIden::Table, TransactionIden::DateTransacted))
                .lte(Expr::cust_with_values("$1::timestamptz", [date_to])),
        );
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn aggregate_transactions(params: &AggregateTransactionsParams) -> DbQueryWithValues {
    let needs_description_tables =
        params.group_by == "description" || params.description_filter.is_some();

    let (select_expr, mut join_clause, group_expr) = match params.group_by.as_str() {
        "category" => (
            "tc.category as group_name",
            "JOIN transaction_categories tc ON e.category_id = tc.id".to_string(),
            "tc.category",
        ),
        "account" => (
            "acc.account_name as group_name",
            "JOIN account acc ON e.account_id = acc.id".to_string(),
            "acc.account_name",
        ),
        "month" => (
            "to_char(t.date_transacted, 'YYYY-MM') as group_name",
            String::new(),
            "to_char(t.date_transacted, 'YYYY-MM')",
        ),
        "description" | _ => (
            "COALESCE(td.description, tg.description, 'No description') as group_name",
            "LEFT JOIN transaction_descriptions td ON td.transaction_id = t.id \
             LEFT JOIN transaction_group tg ON tg.id = t.group_id"
                .to_string(),
            "COALESCE(td.description, tg.description, 'No description')",
        ),
    };

    if needs_description_tables && params.group_by != "description" {
        join_clause.push_str(
            " LEFT JOIN transaction_descriptions td ON td.transaction_id = t.id \
             LEFT JOIN transaction_group tg ON tg.id = t.group_id",
        );
    }

    let mut conditions = vec!["t.user_id = $1".to_string()];
    let mut values: Vec<sea_query::Value> = vec![params.user_id.into()];
    let mut param_idx = 2u32;

    if let Some(ref date_from) = params.date_from {
        conditions.push(format!("t.date_transacted >= ${}::timestamptz", param_idx));
        values.push(date_from.clone().into());
        param_idx += 1;
    }
    if let Some(ref date_to) = params.date_to {
        conditions.push(format!("t.date_transacted <= ${}::timestamptz", param_idx));
        values.push(date_to.clone().into());
        param_idx += 1;
    }
    if let Some(ref desc) = params.description_filter {
        conditions.push(format!(
            "(td.description ILIKE ${p} OR tg.description ILIKE ${p})",
            p = param_idx
        ));
        values.push(escape_ilike_pattern(desc).into());
    }

    let where_clause = conditions.join(" AND ");

    let sql = format!(
        r#"
        SELECT {select_expr},
               SUM(e.quantity) as total_amount,
               COUNT(DISTINCT t.id) as transaction_count
        FROM entry e
        JOIN transaction t ON e.transaction_id = t.id
        {join_clause}
        WHERE {where_clause}
        GROUP BY {group_expr}
        ORDER BY total_amount ASC
        LIMIT 100
        "#,
    );

    DbQueryWithValues {
        query: sql,
        values: sea_query_sqlx::SqlxValues(sea_query::Values(values)),
    }
}

#[tracing::instrument(skip_all)]
pub fn get_active_accounts(params: &ListAccountsParams) -> DbQueryWithValues {
    Query::select()
        .expr_as(
            Expr::col((AccountIden::Table, AccountIden::Id)),
            Alias::new("account_id"),
        )
        .column((AccountIden::Table, AccountIden::AccountName))
        .expr_as(
            Expr::col((AccountTypesIden::Table, AccountTypesIden::AccountTypeName)),
            Alias::new("account_type"),
        )
        .expr_as(
            Expr::col((
                AccountLiquidityTypesIden::Table,
                AccountLiquidityTypesIden::LiquidityTypeName,
            )),
            Alias::new("liquidity_type"),
        )
        .column((AccountIden::Table, AccountIden::Active))
        .from(AccountIden::Table)
        .inner_join(
            AccountTypesIden::Table,
            Expr::col((AccountTypesIden::Table, AccountTypesIden::Id))
                .equals((AccountIden::Table, AccountIden::AccountType)),
        )
        .inner_join(
            AccountLiquidityTypesIden::Table,
            Expr::col((
                AccountLiquidityTypesIden::Table,
                AccountLiquidityTypesIden::Id,
            ))
            .equals((AccountIden::Table, AccountIden::LiquidityType)),
        )
        .and_where(Expr::col((AccountIden::Table, AccountIden::UserId)).eq(params.user_id))
        .and_where(Expr::col((AccountIden::Table, AccountIden::Active)).eq(true))
        .order_by((AccountIden::Table, AccountIden::AccountName), Order::Asc)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_transaction_description_embedding(
    transaction_id: Uuid,
    embedding: Vector,
) -> DbQueryWithValues {
    Query::update()
        .table(TransactionDescriptionsIden::Table)
        .value(
            TransactionDescriptionsIden::Embedding,
            sea_query::Value::from(embedding),
        )
        .and_where(Expr::col(TransactionDescriptionsIden::TransactionId).eq(transaction_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_transaction_group_embedding(group_id: Uuid, embedding: Vector) -> DbQueryWithValues {
    Query::update()
        .table(TransactionGroupIden::Table)
        .value(
            TransactionGroupIden::DescriptionEmbedding,
            sea_query::Value::from(embedding),
        )
        .and_where(Expr::col(TransactionGroupIden::TransactionGroupId).eq(group_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_asset_embedding(asset_id: i32, embedding: Vector) -> DbQueryWithValues {
    Query::update()
        .table(AssetsIden::Table)
        .value(AssetsIden::Embedding, sea_query::Value::from(embedding))
        .and_where(Expr::col(AssetsIden::Id).eq(asset_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_category_embedding(category_id: i32, embedding: Vector) -> DbQueryWithValues {
    Query::update()
        .table(TransactionCategoriesIden::Table)
        .value(
            TransactionCategoriesIden::Embedding,
            sea_query::Value::from(embedding),
        )
        .and_where(Expr::col(TransactionCategoriesIden::Id).eq(category_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
