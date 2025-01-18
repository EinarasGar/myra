use sea_query::{Alias, Expr, ExprTrait, JoinType, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::types::Uuid;

use crate::{
    idens::{
        account_idens::AccountIden,
        entries_idens::{BinnedEntriesIden, EntryIden},
        transaction_idens::TransactionIden,
        CustomFunc,
    },
    models::entry_models::AddEntryModel,
    query_params::get_binned_entries_params::GetBinnedEntriesParams,
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn insert_entries(models: Vec<AddEntryModel>) -> DbQueryWithValues {
    let mut builder2 = Query::insert()
        .into_table(EntryIden::Table)
        .columns([
            EntryIden::AssetId,
            EntryIden::AccountId,
            EntryIden::Quantity,
            EntryIden::CategoryId,
            EntryIden::TransactionId,
        ])
        .returning_col(EntryIden::Id)
        .to_owned();
    for model in models.into_iter() {
        builder2.values_panic(vec![
            model.asset_id.into(),
            model.account_id.into(),
            model.quantity.into(),
            model.category_id.into(),
            model.transaction_id.into(),
        ]);
    }
    builder2.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn get_holdings(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column((EntryIden::Table, EntryIden::AssetId))
        .column((EntryIden::Table, EntryIden::AccountId))
        .expr_as(
            Expr::sum(Expr::col((EntryIden::Table, EntryIden::Quantity))),
            Alias::new("total_quantity"),
        )
        .from(EntryIden::Table)
        .join(
            JoinType::Join,
            AccountIden::Table,
            Expr::col((EntryIden::Table, EntryIden::AccountId))
                .equals((AccountIden::Table, AccountIden::Id)),
        )
        .and_where(Expr::col((AccountIden::Table, AccountIden::UserId)).eq(user_id))
        .group_by_col((EntryIden::Table, EntryIden::AccountId))
        .group_by_col((EntryIden::Table, EntryIden::AssetId))
        .and_having(Expr::sum(Expr::col((EntryIden::Table, EntryIden::Quantity))).ne(0))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

/// This query takes start time, interval and user id. It then queries the database
/// for entries. It collects the sum of entries untill the starting point and places that in the first
/// bin slot. Then it collects the sum of entries from the starting point and places that in the the rest of the bin slots
///
/// |start_time            |asset_id|sum    |notes                                                 |
/// |----------------------|--------|-------|------------------------------------------------------|
/// |2024-11-13 12:54:00+00|3       |1992   |This is collection of everything before timestamp bin |
/// |2024-11-14 10:54:00+00|3       |-335.00|This is after the timestamp                           |
/// |2024-11-14 10:54:00+00|5       |1286   |                                                      |
/// |2024-11-14 16:54:00+00|3       |-1100  |                                                      |
/// |2024-11-15 10:54:00+00|2       |-12.5  |                                                      |
/// |2024-11-15 10:54:00+00|3       |-50    |                                                      |
///
/// ```sql
/// SELECT "start_time",
///     "asset_id",
///     "sum"
/// FROM (
///         SELECT date_bin(interval '120 seconds', $1, 'epoch') AS "start_time",
///             "entry"."asset_id",
///             SUM("entry"."quantity") AS "sum"
///         FROM "entry"
///             JOIN "transaction" ON "entry"."transaction_id" = "transaction"."id"
///         WHERE "transaction"."user_id" = $2
///             AND "transaction"."date_transacted" < date_bin(interval '120 seconds', $1, 'epoch') + (interval '120 seconds')
///         GROUP BY "entry"."asset_id"
///     ) AS "initial_subquery"
/// UNION ALL
/// (
///     SELECT date_bin(
///             interval '120 seconds',
///             "transaction"."date_transacted",
///             'epoch'
///         ) AS "start_time",
///         "entry"."asset_id",
///         SUM("entry"."quantity") AS "sum"
///     FROM "entry"
///         JOIN "transaction" ON "entry"."transaction_id" = "transaction"."id"
///     WHERE "transaction"."user_id" = $2
///         AND "transaction"."date_transacted" >= date_bin(interval '120 seconds', $1, 'epoch') + (interval '120 seconds')
///     GROUP BY "entry"."asset_id",
///         "start_time"
/// )
/// ORDER BY "start_time" ASC
/// ```
#[tracing::instrument(skip_all)]
pub fn get_binned_entries(params: GetBinnedEntriesParams) -> DbQueryWithValues {
    let scoped_subquery = Query::select()
        .expr_as(
            CustomFunc::date_bin_col(
                params.interval,
                (TransactionIden::Table, TransactionIden::DateTransacted),
            ),
            BinnedEntriesIden::StartTime,
        )
        .column((EntryIden::Table, EntryIden::AssetId))
        .expr_as(
            Expr::sum(Expr::col((EntryIden::Table, EntryIden::Quantity))),
            BinnedEntriesIden::Sum,
        )
        .from(EntryIden::Table)
        .join(
            JoinType::Join,
            TransactionIden::Table,
            Expr::col((EntryIden::Table, EntryIden::TransactionId))
                .equals((TransactionIden::Table, TransactionIden::Id)),
        )
        .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(params.user_id))
        .apply_if(params.start_date, |q, v| {
            q.and_where(
                Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)).gte(
                    CustomFunc::date_bin_time(params.interval, v)
                        .add(CustomFunc::interval(params.interval)),
                ),
            );
        })
        .group_by_col((EntryIden::Table, EntryIden::AssetId))
        .group_by_col(BinnedEntriesIden::StartTime)
        .to_owned();

    Query::select()
        .column(BinnedEntriesIden::StartTime)
        .column(EntryIden::AssetId)
        .column(BinnedEntriesIden::Sum)
        .from_subquery(scoped_subquery, BinnedEntriesIden::ScopedSubquery)
        .apply_if(params.start_date, |q, v| {
            let intial_subquery = Query::select()
                .expr_as(
                    CustomFunc::date_bin_time(params.interval, v),
                    BinnedEntriesIden::StartTime,
                )
                .column((EntryIden::Table, EntryIden::AssetId))
                .expr_as(
                    Expr::sum(Expr::col((EntryIden::Table, EntryIden::Quantity))),
                    BinnedEntriesIden::Sum,
                )
                .from(EntryIden::Table)
                .join(
                    JoinType::Join,
                    TransactionIden::Table,
                    Expr::col((EntryIden::Table, EntryIden::TransactionId))
                        .equals((TransactionIden::Table, TransactionIden::Id)),
                )
                .and_where(
                    Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(params.user_id),
                )
                .and_where(
                    Expr::col((TransactionIden::Table, TransactionIden::DateTransacted))
                        .lt(CustomFunc::date_bin_time(params.interval, v)
                            .add(CustomFunc::interval(params.interval))),
                )
                .group_by_col((EntryIden::Table, EntryIden::AssetId))
                .to_owned();
            q.union(sea_query::UnionType::All, intial_subquery);
        })
        .order_by(BinnedEntriesIden::StartTime, sea_query::Order::Asc)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_oldest_entry_date(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .expr(Expr::min(Expr::col(TransactionIden::DateTransacted)))
        .from(TransactionIden::Table)
        .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
