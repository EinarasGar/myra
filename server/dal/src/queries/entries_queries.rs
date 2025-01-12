use sea_query::{Alias, Expr, JoinType, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::types::Uuid;
use time::OffsetDateTime;

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

#[tracing::instrument(skip_all)]
pub fn get_binned_entries(params: GetBinnedEntriesParams) -> DbQueryWithValues {
    Query::select()
        .expr_as(
            CustomFunc::date_bin(
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
        .and_where_option(params.start_date.map(|start_date| {
            Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)).gte(start_date)
        }))
        .group_by_col((EntryIden::Table, EntryIden::AssetId))
        .group_by_col(BinnedEntriesIden::StartTime)
        .order_by(BinnedEntriesIden::StartTime, sea_query::Order::Asc)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_entris_sum_at_timestamp(user_id: Uuid, start_date: OffsetDateTime) -> DbQueryWithValues {
    Query::select()
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
        .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(user_id))
        .and_where(
            Expr::col((TransactionIden::Table, TransactionIden::DateTransacted)).lt(start_date),
        )
        .group_by_col((EntryIden::Table, EntryIden::AssetId))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
