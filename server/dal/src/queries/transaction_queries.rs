use sea_query::extension::postgres::PgExpr;
use sea_query::{
    Alias, Asterisk, CommonTableExpression, Expr, ExprTrait, Func, PostgresQueryBuilder, Query,
    QueryStatementBuilder, SimpleExpr, WindowStatement, WithClause,
};
use sea_query_sqlx::SqlxBinder;

use crate::{
    idens::{
        account_idens::AccountIden,
        entries_idens::EntryIden,
        transaction_idens::{
            CombinedTransactionIden, TransactionDescriptionsIden, TransactionGroupIden,
            TransactionIden,
        },
    },
    query_params::{
        get_combined_transactions_params::GetCombinedTransactionsParams,
        get_transaction_with_entries_params::{
            GetTransactionWithEntriesParams, GetTransactionWithEntriesParamsSeachType, GroupFilter,
        },
        paging_params::PaginationMode,
    },
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn get_transaction_with_entries(params: GetTransactionWithEntriesParams) -> DbQueryWithValues {
    let apply_ownership_share = params.apply_ownership_share;
    let mut eligible_transactions_builder = Query::select()
        .column(TransactionIden::Id)
        .column(TransactionIden::UserId)
        .column(TransactionIden::TypeId)
        .column(TransactionIden::DateTransacted)
        .conditions(
            params.paging.is_some(),
            |q| {
                q.expr_window_as(
                    Expr::col(Asterisk).count(),
                    WindowStatement::default(),
                    Alias::new("total_results"),
                );
            },
            |_q| {},
        )
        .from(TransactionIden::Table)
        .to_owned();

    match params.search_type {
        GetTransactionWithEntriesParamsSeachType::ByTransactionId(uuid) => {
            eligible_transactions_builder
                .and_where(Expr::col((TransactionIden::Table, TransactionIden::Id)).eq(uuid))
        }
        GetTransactionWithEntriesParamsSeachType::ByTransactionIds(uuids) => {
            eligible_transactions_builder
                .and_where(Expr::col((TransactionIden::Table, TransactionIden::Id)).is_in(uuids))
        }
        GetTransactionWithEntriesParamsSeachType::ByUserId(uuid) => eligible_transactions_builder
            .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(uuid)),
    };

    if let Some(account_id) = params.account_filter {
        let account_tx_subquery = Query::select()
            .column(EntryIden::TransactionId)
            .from(EntryIden::Table)
            .and_where(Expr::col(EntryIden::AccountId).eq(account_id))
            .distinct()
            .to_owned();

        eligible_transactions_builder.and_where(
            Expr::col((TransactionIden::Table, TransactionIden::Id))
                .in_subquery(account_tx_subquery),
        );
    }

    match params.group_filter {
        GroupFilter::IndividualOnly => {
            eligible_transactions_builder
                .and_where(Expr::col((TransactionIden::Table, TransactionIden::GroupId)).is_null());
        }
        GroupFilter::GroupedOnly => {
            eligible_transactions_builder.and_where(
                Expr::col((TransactionIden::Table, TransactionIden::GroupId)).is_not_null(),
            );
        }
        GroupFilter::ByGroupId(gid) => {
            eligible_transactions_builder
                .and_where(Expr::col((TransactionIden::Table, TransactionIden::GroupId)).eq(gid));
        }
        GroupFilter::All => {}
    }

    if let Some(ref query) = params.search_query {
        let search_pattern = super::escape_ilike_pattern(query);
        eligible_transactions_builder.join(
            sea_query::JoinType::LeftJoin,
            TransactionDescriptionsIden::Table,
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::TransactionId,
            ))
            .equals((TransactionIden::Table, TransactionIden::Id)),
        );
        eligible_transactions_builder.and_where(
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::Description,
            ))
            .ilike(&search_pattern),
        );
    }

    eligible_transactions_builder
        .order_by(TransactionIden::DateTransacted, sea_query::Order::Desc)
        .order_by(TransactionIden::Id, sea_query::Order::Desc);

    let is_paged = params.paging.is_some();
    if let Some(paging) = params.paging {
        eligible_transactions_builder
            .limit(paging.count)
            .offset(paging.start);
    }

    if let Some(cursor) = params.cursor_paging {
        let date_subquery = Query::select()
            .column(TransactionIden::DateTransacted)
            .from(TransactionIden::Table)
            .and_where(Expr::col(TransactionIden::Id).eq(cursor.cursor_id))
            .to_owned();

        eligible_transactions_builder.and_where(
            Expr::tuple([
                Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)).into(),
                Expr::col((TransactionIden::Table, TransactionIden::Id)).into(),
            ])
            .lt(Expr::tuple([
                SimpleExpr::SubQuery(None, Box::new(date_subquery.into_sub_query_statement())),
                Expr::value(cursor.cursor_id),
            ])),
        );
        eligible_transactions_builder.limit(cursor.limit + 1);
    }

    let mut outer_query = Query::select()
        .column((EntryIden::Table, EntryIden::Id))
        .column((EntryIden::Table, EntryIden::AssetId))
        .column((EntryIden::Table, EntryIden::AccountId))
        .conditions(
            apply_ownership_share,
            |q| {
                q.expr_as(
                    Expr::col((EntryIden::Table, EntryIden::Quantity))
                        .mul(Expr::col((AccountIden::Table, AccountIden::OwnershipShare))),
                    Alias::new("quantity"),
                );
            },
            |q| {
                q.column((EntryIden::Table, EntryIden::Quantity));
            },
        )
        .column((EntryIden::Table, EntryIden::CategoryId))
        .column((EntryIden::Table, EntryIden::TransactionId))
        .column((TransactionIden::Table, TransactionIden::UserId))
        .column((TransactionIden::Table, TransactionIden::TypeId))
        .column((TransactionIden::Table, TransactionIden::DateTransacted))
        .conditions(
            is_paged,
            |q| {
                q.column((TransactionIden::Table, Alias::new("total_results")));
            },
            |_q| {},
        )
        .from(EntryIden::Table)
        .join_subquery(
            sea_query::JoinType::InnerJoin,
            eligible_transactions_builder,
            TransactionIden::Table,
            Expr::col((EntryIden::Table, EntryIden::TransactionId))
                .equals((TransactionIden::Table, TransactionIden::Id)),
        )
        .to_owned();

    if apply_ownership_share {
        outer_query.join(
            sea_query::JoinType::InnerJoin,
            AccountIden::Table,
            Expr::col((EntryIden::Table, EntryIden::AccountId))
                .equals((AccountIden::Table, AccountIden::Id)),
        );
    }

    // The outer query must repeat the ordering from the subquery so that
    // result rows are returned in the correct sequence for cursor pagination.
    outer_query
        .order_by(
            (TransactionIden::Table, TransactionIden::DateTransacted),
            sea_query::Order::Desc,
        )
        .order_by(
            (TransactionIden::Table, TransactionIden::Id),
            sea_query::Order::Desc,
        );

    outer_query.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn get_combined_transaction_ids_for_user(
    params: GetCombinedTransactionsParams,
) -> DbQueryWithValues {
    // --- CTE: individual transactions half ---
    let mut individual_query = Query::select()
        .column((TransactionIden::Table, TransactionIden::Id))
        .expr_as(
            Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)),
            CombinedTransactionIden::SortDate,
        )
        .expr_as(
            Func::cast_as(Expr::val("individual"), Alias::new("text")),
            CombinedTransactionIden::ItemType,
        )
        .column((
            TransactionDescriptionsIden::Table,
            TransactionDescriptionsIden::Description,
        ))
        .from(TransactionIden::Table)
        .join(
            sea_query::JoinType::LeftJoin,
            TransactionDescriptionsIden::Table,
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::TransactionId,
            ))
            .equals((TransactionIden::Table, TransactionIden::Id)),
        )
        .and_where(Expr::col((TransactionIden::Table, TransactionIden::GroupId)).is_null())
        .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(params.user_id))
        .to_owned();

    // --- CTE: group transactions half (DISTINCT ON tg.id) ---
    let group_query = Query::select()
        .distinct_on([(
            TransactionGroupIden::Table,
            TransactionGroupIden::TransactionGroupId,
        )])
        .column((
            TransactionGroupIden::Table,
            TransactionGroupIden::TransactionGroupId,
        ))
        .expr_as(
            Expr::col((TransactionGroupIden::Table, TransactionGroupIden::DateAdded)),
            CombinedTransactionIden::SortDate,
        )
        .expr_as(
            Func::cast_as(Expr::val("group"), Alias::new("text")),
            CombinedTransactionIden::ItemType,
        )
        .expr_as(
            Func::coalesce([
                Expr::col((
                    TransactionGroupIden::Table,
                    TransactionGroupIden::Description,
                )),
                Expr::col((
                    TransactionDescriptionsIden::Table,
                    TransactionDescriptionsIden::Description,
                )),
            ]),
            TransactionDescriptionsIden::Description,
        )
        .from(TransactionGroupIden::Table)
        .join(
            sea_query::JoinType::InnerJoin,
            TransactionIden::Table,
            Expr::col((TransactionIden::Table, TransactionIden::GroupId)).equals((
                TransactionGroupIden::Table,
                TransactionGroupIden::TransactionGroupId,
            )),
        )
        .join(
            sea_query::JoinType::LeftJoin,
            TransactionDescriptionsIden::Table,
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::TransactionId,
            ))
            .equals((TransactionIden::Table, TransactionIden::Id)),
        )
        .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(params.user_id))
        .to_owned();

    // --- CTE: UNION ALL ---
    let combined_cte_query = individual_query
        .union(sea_query::UnionType::All, group_query)
        .to_owned();

    let combined_cte = CommonTableExpression::new()
        .query(combined_cte_query)
        .table_name(CombinedTransactionIden::Combined)
        .to_owned();

    // --- Main query: SELECT from CTE ---
    let mut main_query = Query::select();
    main_query
        .column((
            CombinedTransactionIden::Combined,
            CombinedTransactionIden::Id,
        ))
        .column((
            CombinedTransactionIden::Combined,
            CombinedTransactionIden::ItemType,
        ))
        .from(CombinedTransactionIden::Combined);

    // --- Optional ILIKE filter on description ---
    if let Some(ref query) = params.search_query {
        let search_pattern = super::escape_ilike_pattern(query);
        main_query.and_where(
            Expr::col((
                CombinedTransactionIden::Combined,
                TransactionDescriptionsIden::Description,
            ))
            .ilike(&search_pattern),
        );
    }

    // --- Cursor-based pagination WHERE clause ---
    if let PaginationMode::Cursor(ref cursor) = params.pagination {
        // Cursor subquery: look up the cursor's sort_date and id from either table
        let mut cursor_from_tx = Query::select()
            .expr_as(
                Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)),
                CombinedTransactionIden::SortDate,
            )
            .column((TransactionIden::Table, TransactionIden::Id))
            .from(TransactionIden::Table)
            .and_where(
                Expr::col((TransactionIden::Table, TransactionIden::Id)).eq(cursor.cursor_id),
            )
            .to_owned();

        let cursor_from_group = Query::select()
            .expr_as(
                Expr::col((TransactionGroupIden::Table, TransactionGroupIden::DateAdded)),
                CombinedTransactionIden::SortDate,
            )
            .column((
                TransactionGroupIden::Table,
                TransactionGroupIden::TransactionGroupId,
            ))
            .from(TransactionGroupIden::Table)
            .and_where(
                Expr::col((
                    TransactionGroupIden::Table,
                    TransactionGroupIden::TransactionGroupId,
                ))
                .eq(cursor.cursor_id),
            )
            .to_owned();

        let cursor_union = cursor_from_tx
            .union(sea_query::UnionType::All, cursor_from_group)
            .to_owned();

        // Wrap in a subquery: SELECT c2.sort_date, c2.id FROM (...) c2 LIMIT 1
        let cursor_subquery = Query::select()
            .column((
                CombinedTransactionIden::CursorLookup,
                CombinedTransactionIden::SortDate,
            ))
            .column((
                CombinedTransactionIden::CursorLookup,
                CombinedTransactionIden::Id,
            ))
            .from_subquery(cursor_union, CombinedTransactionIden::CursorLookup)
            .limit(1)
            .to_owned();

        // WHERE (sort_date, id) < (SELECT c2.sort_date, c2.id FROM (...) c2 LIMIT 1)
        main_query.and_where(
            Expr::tuple([
                Expr::col((
                    CombinedTransactionIden::Combined,
                    CombinedTransactionIden::SortDate,
                )),
                Expr::col((
                    CombinedTransactionIden::Combined,
                    CombinedTransactionIden::Id,
                )),
            ])
            .lt(SimpleExpr::SubQuery(
                None,
                Box::new(cursor_subquery.into_sub_query_statement()),
            )),
        );
    }

    // --- ORDER BY ---
    main_query
        .order_by(
            (
                CombinedTransactionIden::Combined,
                CombinedTransactionIden::SortDate,
            ),
            sea_query::Order::Desc,
        )
        .order_by(
            (
                CombinedTransactionIden::Combined,
                CombinedTransactionIden::Id,
            ),
            sea_query::Order::Desc,
        );

    // --- LIMIT / OFFSET ---
    match &params.pagination {
        PaginationMode::Cursor(c) => {
            main_query.limit(c.limit + 1);
        }
        PaginationMode::CursorFirstPage { limit } => {
            main_query.limit(limit + 1);
        }
        PaginationMode::Offset(p) => {
            main_query.limit(p.count).offset(p.start);
        }
    }

    // --- Attach CTE ---
    main_query
        .with(WithClause::new().cte(combined_cte).to_owned())
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
