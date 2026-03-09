// Transaction group query implementations

use sea_query::extension::postgres::PgExpr;
use sea_query::{
    Alias, Asterisk, Expr, ExprTrait, PostgresQueryBuilder, Query, QueryStatementBuilder,
    SimpleExpr, WindowStatement,
};
use sea_query_sqlx::SqlxBinder;
use sqlx::types::Uuid;

use crate::{
    idens::{
        entries_idens::EntryIden,
        transaction_idens::{TransactionDescriptionsIden, TransactionGroupIden, TransactionIden},
    },
    models::transaction_models::{AddTransactionGroupModel, UpdateTransactionGroupModel},
    query_params::{
        get_transaction_groups_params::GetTransactionGroupsParams, paging_params::PaginationMode,
    },
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn insert_transaction_group(model: AddTransactionGroupModel) -> DbQueryWithValues {
    Query::insert()
        .into_table(TransactionGroupIden::Table)
        .columns([
            TransactionGroupIden::CategoryId,
            TransactionGroupIden::Description,
            TransactionGroupIden::DateAdded,
        ])
        .returning_col(TransactionGroupIden::TransactionGroupId)
        .values_panic(vec![
            model.category_id.into(),
            model.description.into(),
            model.date_added.into(),
        ])
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_transaction_group(model: UpdateTransactionGroupModel) -> DbQueryWithValues {
    Query::update()
        .table(TransactionGroupIden::Table)
        .value(TransactionGroupIden::CategoryId, model.category_id)
        .value(TransactionGroupIden::Description, model.description)
        .value(TransactionGroupIden::DateAdded, model.date_added)
        .and_where(Expr::col(TransactionGroupIden::TransactionGroupId).eq(model.id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_transaction_group(group_id: Uuid) -> DbQueryWithValues {
    Query::delete()
        .from_table(TransactionGroupIden::Table)
        .and_where(Expr::col(TransactionGroupIden::TransactionGroupId).eq(group_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn set_group_id_on_transactions(
    group_id: Uuid,
    transaction_ids: Vec<Uuid>,
) -> DbQueryWithValues {
    Query::update()
        .table(TransactionIden::Table)
        .value(TransactionIden::GroupId, group_id)
        .and_where(Expr::col(TransactionIden::Id).is_in(transaction_ids))
        .and_where(Expr::col(TransactionIden::GroupId).is_null())
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_transactions_by_group(group_id: Uuid) -> DbQueryWithValues {
    Query::delete()
        .from_table(TransactionIden::Table)
        .and_where(Expr::col(TransactionIden::GroupId).eq(group_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_transaction_descriptions_by_group(group_id: Uuid) -> DbQueryWithValues {
    let subquery = Query::select()
        .column(TransactionIden::Id)
        .from(TransactionIden::Table)
        .and_where(Expr::col(TransactionIden::GroupId).eq(group_id))
        .to_owned();

    Query::delete()
        .from_table(TransactionDescriptionsIden::Table)
        .and_where(Expr::col(TransactionDescriptionsIden::TransactionId).in_subquery(subquery))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_transaction_entries_by_group(group_id: Uuid) -> DbQueryWithValues {
    let subquery = Query::select()
        .column(TransactionIden::Id)
        .from(TransactionIden::Table)
        .and_where(Expr::col(TransactionIden::GroupId).eq(group_id))
        .to_owned();

    Query::delete()
        .from_table(EntryIden::Table)
        .and_where(Expr::col(EntryIden::TransactionId).in_subquery(subquery))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_transaction_groups_for_user(params: GetTransactionGroupsParams) -> DbQueryWithValues {
    let is_offset_paging = matches!(params.pagination, PaginationMode::Offset(_));

    let mut builder = Query::select();

    builder
        .expr_as(
            Expr::col((
                TransactionGroupIden::Table,
                TransactionGroupIden::TransactionGroupId,
            )),
            Alias::new("id"),
        )
        .column((
            TransactionGroupIden::Table,
            TransactionGroupIden::CategoryId,
        ))
        .column((
            TransactionGroupIden::Table,
            TransactionGroupIden::Description,
        ))
        .column((TransactionGroupIden::Table, TransactionGroupIden::DateAdded));

    // For offset pagination, add COUNT(*) OVER() AS total_results window function
    if is_offset_paging {
        builder.expr_window_as(
            Expr::col(Asterisk).count(),
            WindowStatement::default(),
            Alias::new("total_results"),
        );
    }

    builder.from(TransactionGroupIden::Table);

    // INNER JOIN transaction ON transaction.group_id = transaction_group.id
    builder.join(
        sea_query::JoinType::InnerJoin,
        TransactionIden::Table,
        Expr::col((TransactionIden::Table, TransactionIden::GroupId)).equals((
            TransactionGroupIden::Table,
            TransactionGroupIden::TransactionGroupId,
        )),
    );

    // WHERE transaction.user_id = params.user_id
    builder
        .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(params.user_id));

    // If search_query is Some: LEFT JOIN transaction_descriptions and add ILIKE condition
    if let Some(ref query) = params.search_query {
        builder.join(
            sea_query::JoinType::LeftJoin,
            TransactionDescriptionsIden::Table,
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::TransactionId,
            ))
            .equals((TransactionIden::Table, TransactionIden::Id)),
        );

        let search_pattern = super::escape_ilike_pattern(query);
        let group_desc_like = Expr::col((
            TransactionGroupIden::Table,
            TransactionGroupIden::Description,
        ))
        .ilike(&search_pattern);
        let tx_desc_like = Expr::col((
            TransactionDescriptionsIden::Table,
            TransactionDescriptionsIden::Description,
        ))
        .ilike(&search_pattern);
        builder.and_where(group_desc_like.or(tx_desc_like));
    }

    // GROUP BY transaction_group.id, category_id, description, date_added
    builder
        .group_by_col((
            TransactionGroupIden::Table,
            TransactionGroupIden::TransactionGroupId,
        ))
        .group_by_col((
            TransactionGroupIden::Table,
            TransactionGroupIden::CategoryId,
        ))
        .group_by_col((
            TransactionGroupIden::Table,
            TransactionGroupIden::Description,
        ))
        .group_by_col((TransactionGroupIden::Table, TransactionGroupIden::DateAdded));

    // ORDER BY date_added DESC, id DESC
    builder
        .order_by(
            (TransactionGroupIden::Table, TransactionGroupIden::DateAdded),
            sea_query::Order::Desc,
        )
        .order_by(
            (
                TransactionGroupIden::Table,
                TransactionGroupIden::TransactionGroupId,
            ),
            sea_query::Order::Desc,
        );

    // Apply pagination
    match params.pagination {
        PaginationMode::Offset(paging) => {
            builder.limit(paging.count).offset(paging.start);
        }
        PaginationMode::Cursor(cursor) => {
            let date_subquery = Query::select()
                .column(TransactionGroupIden::DateAdded)
                .from(TransactionGroupIden::Table)
                .and_where(Expr::col(TransactionGroupIden::TransactionGroupId).eq(cursor.cursor_id))
                .to_owned();

            builder.and_where(
                Expr::tuple([
                    Expr::col((TransactionGroupIden::Table, TransactionGroupIden::DateAdded)),
                    Expr::col((
                        TransactionGroupIden::Table,
                        TransactionGroupIden::TransactionGroupId,
                    )),
                ])
                .lt(Expr::tuple([
                    SimpleExpr::SubQuery(None, Box::new(date_subquery.into_sub_query_statement())),
                    Expr::value(cursor.cursor_id),
                ])),
            );
            builder.limit(cursor.limit + 1);
        }
        PaginationMode::CursorFirstPage { limit } => {
            builder.limit(limit + 1);
        }
    }

    builder.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn get_transaction_ids_by_groups(group_ids: Vec<Uuid>) -> DbQueryWithValues {
    Query::select()
        .column(TransactionIden::Id)
        .column(TransactionIden::GroupId)
        .from(TransactionIden::Table)
        .and_where(Expr::col(TransactionIden::GroupId).is_in(group_ids))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_transaction_groups_by_ids(group_ids: Vec<Uuid>) -> DbQueryWithValues {
    Query::select()
        .columns([
            TransactionGroupIden::TransactionGroupId,
            TransactionGroupIden::CategoryId,
            TransactionGroupIden::Description,
            TransactionGroupIden::DateAdded,
        ])
        .from(TransactionGroupIden::Table)
        .and_where(Expr::col(TransactionGroupIden::TransactionGroupId).is_in(group_ids))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
