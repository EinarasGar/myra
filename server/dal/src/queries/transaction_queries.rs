use sea_query::extension::postgres::PgExpr;
use sea_query::{
    Alias, Asterisk, CommonTableExpression, Expr, ExprTrait, Func, Order, PostgresQueryBuilder,
    Query, QueryStatementBuilder, SimpleExpr, WindowStatement, WithClause,
};
use sea_query_sqlx::SqlxBinder;

use sqlx::types::Uuid;

use crate::{
    idens::{
        account_idens::{AccountIden, AccountTypesIden},
        asset_idens::{AssetTypesIden, AssetsIden},
        entries_idens::EntryIden,
        transaction_idens::{
            CombinedTransactionIden, TransactionCategoriesIden, TransactionCategoryTypeIden,
            TransactionDescriptionsIden, TransactionDividendsIden, TransactionGroupIden,
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

#[macros::named_query]
pub fn get_transaction_with_entries(params: GetTransactionWithEntriesParams) -> DbQueryWithValues {
    let apply_ownership_share = params.apply_ownership_share;
    let mut eligible_transactions_builder = Query::select()
        .column(TransactionIden::Id)
        .column(TransactionIden::UserId)
        .column(TransactionIden::TypeId)
        .column(TransactionIden::DateTransacted)
        .column(TransactionIden::Visibility)
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

    if let Some(ref type_ids) = params.transaction_type_ids {
        if !type_ids.is_empty() {
            eligible_transactions_builder.and_where(
                Expr::col((TransactionIden::Table, TransactionIden::TypeId))
                    .is_in(type_ids.iter().copied()),
            );
        }
    }
    if let Some(date_from) = params.date_from {
        eligible_transactions_builder.and_where(
            Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)).gte(date_from),
        );
    }
    if let Some(date_to) = params.date_to {
        eligible_transactions_builder.and_where(
            Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)).lte(date_to),
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
                Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)),
                Expr::col((TransactionIden::Table, TransactionIden::Id)),
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
        .column((TransactionIden::Table, TransactionIden::Visibility))
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

#[macros::named_query]
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
    main_query.expr_window_as(
        Expr::col(Asterisk).count(),
        WindowStatement::default(),
        Alias::new("total_results"),
    );

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

#[macros::named_query]
pub fn get_ledger_export_rows(user_id: Uuid) -> DbQueryWithValues {
    let base_pair_alias = Alias::new("base_pair");
    let group_category_alias = Alias::new("group_category");

    let base_pair_sub = Query::select()
        .column((AssetsIden::Table, AssetsIden::Id))
        .column((AssetsIden::Table, AssetsIden::Ticker))
        .from(AssetsIden::Table)
        .to_owned();

    let group_category_sub = Query::select()
        .column((
            TransactionCategoriesIden::Table,
            TransactionCategoriesIden::Id,
        ))
        .column((
            TransactionCategoriesIden::Table,
            TransactionCategoriesIden::Category,
        ))
        .column((
            TransactionCategoryTypeIden::Table,
            TransactionCategoryTypeIden::CategoryTypeName,
        ))
        .from(TransactionCategoriesIden::Table)
        .left_join(
            TransactionCategoryTypeIden::Table,
            Expr::col((
                TransactionCategoriesIden::Table,
                TransactionCategoriesIden::CategoryType,
            ))
            .equals((
                TransactionCategoryTypeIden::Table,
                TransactionCategoryTypeIden::Id,
            )),
        )
        .to_owned();

    let mut query = Query::select();
    query
        .expr_as(
            Expr::col((EntryIden::Table, EntryIden::Id)),
            Alias::new("entry_id"),
        )
        .expr_as(
            Expr::col((TransactionIden::Table, TransactionIden::Id)),
            Alias::new("transaction_id"),
        )
        .expr_as(
            Expr::col((TransactionIden::Table, TransactionIden::UserId)),
            Alias::new("user_id"),
        )
        .expr_as(
            Expr::col((TransactionIden::Table, TransactionIden::TypeId)),
            Alias::new("type_id"),
        )
        .expr_as(
            Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)),
            Alias::new("date_transacted"),
        )
        .expr_as(
            Expr::col((TransactionIden::Table, TransactionIden::Visibility)),
            Alias::new("visibility"),
        )
        .expr_as(
            Expr::col((TransactionIden::Table, TransactionIden::GroupId)),
            Alias::new("group_id"),
        )
        .expr_as(
            Expr::col((EntryIden::Table, EntryIden::Quantity)),
            Alias::new("entry_quantity"),
        )
        .expr_as(
            Expr::col((EntryIden::Table, EntryIden::AccountId)),
            Alias::new("entry_account_id"),
        )
        .expr_as(
            Expr::col((EntryIden::Table, EntryIden::AssetId)),
            Alias::new("entry_asset_id"),
        )
        .expr_as(
            Expr::col((EntryIden::Table, EntryIden::CategoryId)),
            Alias::new("entry_category_id"),
        )
        .expr_as(
            Expr::col((
                TransactionCategoriesIden::Table,
                TransactionCategoriesIden::Category,
            )),
            Alias::new("category_name"),
        )
        .expr_as(
            Expr::col((
                TransactionCategoryTypeIden::Table,
                TransactionCategoryTypeIden::CategoryTypeName,
            )),
            Alias::new("category_type_name"),
        )
        .expr_as(
            Expr::col((AssetsIden::Table, AssetsIden::Ticker)),
            Alias::new("asset_ticker"),
        )
        .expr_as(
            Expr::col((AssetsIden::Table, AssetsIden::AssetName)),
            Alias::new("asset_name"),
        )
        .expr_as(
            Expr::col((AssetTypesIden::Table, AssetTypesIden::AssetTypeName)),
            Alias::new("asset_type_name"),
        )
        .expr_as(
            Expr::col((AssetsIden::Table, AssetsIden::UserId)),
            Alias::new("asset_user_id"),
        )
        .expr_as(
            Expr::col((AssetsIden::Table, AssetsIden::BasePairId)),
            Alias::new("asset_base_pair_id"),
        )
        .expr_as(
            Expr::col((base_pair_alias.clone(), AssetsIden::Ticker)),
            Alias::new("base_pair_ticker"),
        )
        .expr_as(
            Expr::col((AccountIden::Table, AccountIden::AccountName)),
            Alias::new("account_name"),
        )
        .expr_as(
            Expr::col((AccountTypesIden::Table, AccountTypesIden::AccountTypeName)),
            Alias::new("account_type_name"),
        )
        .expr_as(
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::Description,
            )),
            Alias::new("description"),
        )
        .expr_as(
            Expr::col((
                TransactionDividendsIden::Table,
                TransactionDividendsIden::SourceAssetId,
            )),
            Alias::new("dividend_source_asset_id"),
        )
        .expr_as(
            Expr::col((
                TransactionGroupIden::Table,
                TransactionGroupIden::Description,
            )),
            Alias::new("group_description"),
        )
        .expr_as(
            Expr::col((
                TransactionGroupIden::Table,
                TransactionGroupIden::CategoryId,
            )),
            Alias::new("group_category_id"),
        )
        .expr_as(
            Expr::col((TransactionGroupIden::Table, TransactionGroupIden::DateAdded)),
            Alias::new("group_date_added"),
        )
        .expr_as(
            Expr::col((
                group_category_alias.clone(),
                TransactionCategoriesIden::Category,
            )),
            Alias::new("group_category_name"),
        )
        .expr_as(
            Expr::col((
                group_category_alias.clone(),
                TransactionCategoryTypeIden::CategoryTypeName,
            )),
            Alias::new("group_category_type_name"),
        )
        .from(EntryIden::Table)
        .inner_join(
            TransactionIden::Table,
            Expr::col((EntryIden::Table, EntryIden::TransactionId))
                .equals((TransactionIden::Table, TransactionIden::Id)),
        )
        .left_join(
            TransactionCategoriesIden::Table,
            Expr::col((EntryIden::Table, EntryIden::CategoryId)).equals((
                TransactionCategoriesIden::Table,
                TransactionCategoriesIden::Id,
            )),
        )
        .left_join(
            TransactionCategoryTypeIden::Table,
            Expr::col((
                TransactionCategoriesIden::Table,
                TransactionCategoriesIden::CategoryType,
            ))
            .equals((
                TransactionCategoryTypeIden::Table,
                TransactionCategoryTypeIden::Id,
            )),
        )
        .left_join(
            AssetsIden::Table,
            Expr::col((EntryIden::Table, EntryIden::AssetId))
                .equals((AssetsIden::Table, AssetsIden::Id)),
        )
        .left_join(
            AssetTypesIden::Table,
            Expr::col((AssetsIden::Table, AssetsIden::AssetType))
                .equals((AssetTypesIden::Table, AssetTypesIden::Id)),
        )
        .left_join(
            AccountIden::Table,
            Expr::col((EntryIden::Table, EntryIden::AccountId))
                .equals((AccountIden::Table, AccountIden::Id)),
        )
        .left_join(
            AccountTypesIden::Table,
            Expr::col((AccountIden::Table, AccountIden::AccountType))
                .equals((AccountTypesIden::Table, AccountTypesIden::Id)),
        )
        .left_join(
            TransactionDescriptionsIden::Table,
            Expr::col((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::TransactionId,
            ))
            .equals((TransactionIden::Table, TransactionIden::Id)),
        )
        .left_join(
            TransactionDividendsIden::Table,
            Expr::col((
                TransactionDividendsIden::Table,
                TransactionDividendsIden::TransactionId,
            ))
            .equals((TransactionIden::Table, TransactionIden::Id)),
        )
        .left_join(
            TransactionGroupIden::Table,
            Expr::col((TransactionIden::Table, TransactionIden::GroupId)).equals((
                TransactionGroupIden::Table,
                TransactionGroupIden::TransactionGroupId,
            )),
        )
        .join_subquery(
            sea_query::JoinType::LeftJoin,
            base_pair_sub.clone(),
            base_pair_alias.clone(),
            Expr::col((AssetsIden::Table, AssetsIden::BasePairId))
                .equals((base_pair_alias.clone(), AssetsIden::Id)),
        )
        .join_subquery(
            sea_query::JoinType::LeftJoin,
            group_category_sub.clone(),
            group_category_alias.clone(),
            Expr::col((
                TransactionGroupIden::Table,
                TransactionGroupIden::CategoryId,
            ))
            .equals((group_category_alias.clone(), TransactionCategoriesIden::Id)),
        )
        .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(user_id))
        .order_by(
            (TransactionIden::Table, TransactionIden::DateTransacted),
            Order::Asc,
        )
        .order_by((TransactionIden::Table, TransactionIden::Id), Order::Asc)
        .order_by((EntryIden::Table, EntryIden::Id), Order::Asc);

    query.build_sqlx(PostgresQueryBuilder).into()
}
