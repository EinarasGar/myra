use sea_query::{Expr, ExprTrait, Order, PostgresQueryBuilder, Query};
use sea_query_sqlx::SqlxBinder;
use sqlx::types::Uuid;

use super::DbQueryWithValues;
use crate::idens::account_idens::AccountIden;
use crate::idens::account_identifier_idens::AccountIdentifierIden;
use crate::models::account_models::AccountIdentifierInsert;

#[macros::named_query]
pub fn insert_account_identifiers(rows: Vec<AccountIdentifierInsert>) -> DbQueryWithValues {
    let mut builder = Query::insert()
        .into_table(AccountIdentifierIden::Table)
        .columns([
            AccountIdentifierIden::AccountId,
            AccountIdentifierIden::Kind,
            AccountIdentifierIden::Value,
        ])
        .to_owned();
    for r in rows {
        builder.values_panic([r.account_id.into(), r.kind.into(), r.value.into()]);
    }
    builder.build_sqlx(PostgresQueryBuilder).into()
}

#[macros::named_query]
pub fn get_identifiers_for_accounts(account_ids: Vec<Uuid>) -> DbQueryWithValues {
    Query::select()
        .column(AccountIdentifierIden::AccountId)
        .column(AccountIdentifierIden::Kind)
        .column(AccountIdentifierIden::Value)
        .from(AccountIdentifierIden::Table)
        .and_where(Expr::col(AccountIdentifierIden::AccountId).is_in(account_ids))
        .order_by(AccountIdentifierIden::Value, Order::Asc)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn delete_account_identifiers(account_id: Uuid) -> DbQueryWithValues {
    Query::delete()
        .from_table(AccountIdentifierIden::Table)
        .and_where(Expr::col(AccountIdentifierIden::AccountId).eq(account_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn find_conflicting_identifiers(
    user_id: Uuid,
    exclude_account_id: Option<Uuid>,
    values: &[String],
) -> DbQueryWithValues {
    let mut builder = Query::select()
        .column((AccountIdentifierIden::Table, AccountIdentifierIden::Kind))
        .column((AccountIdentifierIden::Table, AccountIdentifierIden::Value))
        .from(AccountIdentifierIden::Table)
        .inner_join(
            AccountIden::Table,
            Expr::col((AccountIden::Table, AccountIden::Id)).equals((
                AccountIdentifierIden::Table,
                AccountIdentifierIden::AccountId,
            )),
        )
        .and_where(Expr::col((AccountIden::Table, AccountIden::UserId)).eq(user_id))
        .and_where(
            Expr::col((AccountIdentifierIden::Table, AccountIdentifierIden::Value))
                .is_in(values.iter().cloned()),
        )
        .to_owned();
    if let Some(id) = exclude_account_id {
        builder.and_where(
            Expr::col((
                AccountIdentifierIden::Table,
                AccountIdentifierIden::AccountId,
            ))
            .ne(id),
        );
    }
    builder.build_sqlx(PostgresQueryBuilder).into()
}
