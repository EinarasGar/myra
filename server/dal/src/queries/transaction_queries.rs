use sea_query::{Alias, Asterisk, Expr, ExprTrait, PostgresQueryBuilder, Query, WindowStatement};
use sea_query_sqlx::SqlxBinder;

use crate::{
    idens::{account_idens::AccountIden, entries_idens::EntryIden, transaction_idens::TransactionIden},
    query_params::get_transaction_with_entries_params::{
        GetTransactionWithEntriesParams, GetTransactionWithEntriesParamsSeachType,
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

    eligible_transactions_builder
        .order_by(TransactionIden::DateTransacted, sea_query::Order::Desc);

    let is_paged = params.paging.is_some();
    if let Some(paging) = params.paging {
        eligible_transactions_builder
            .limit(paging.count)
            .offset(paging.start);
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

    outer_query.build_sqlx(PostgresQueryBuilder).into()
}
