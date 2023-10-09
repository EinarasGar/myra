use sea_query::*;
use sea_query_binder::SqlxBinder;
use sqlx::types::Uuid;

use crate::{
    idens::user_idens::{UserRolesIden, UsersIden},
    models::user_models::AddUserModel,
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn inset_user(user: AddUserModel) -> DbQueryWithValues {
    Query::insert()
        .into_table(UsersIden::Table)
        .columns([
            UsersIden::Id,
            UsersIden::Username,
            UsersIden::Password,
            UsersIden::DefaultAssset,
        ])
        .values_panic([
            user.id.into(),
            user.username.into(),
            user.password.into(),
            user.default_asset.into(),
        ])
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_user_auth_info(username: String) -> DbQueryWithValues {
    Query::select()
        .column((UsersIden::Table, UsersIden::Id))
        .column((UsersIden::Table, UsersIden::Password))
        .expr_as(
            Expr::col((UserRolesIden::Table, UserRolesIden::Name)),
            Alias::new("role"),
        )
        .from(UsersIden::Table)
        .inner_join(
            UserRolesIden::Table,
            Expr::col((UsersIden::Table, UsersIden::Role))
                .equals((UserRolesIden::Table, UserRolesIden::Id)),
        )
        .and_where(Expr::col(UsersIden::Username).eq(username))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_user_role(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column(UserRolesIden::Id)
        .column(UserRolesIden::Name)
        .from(UserRolesIden::Table)
        .and_where(
            Expr::col(UserRolesIden::Id).in_subquery(
                Query::select()
                    .column(UsersIden::Role)
                    .from(UsersIden::Table)
                    .and_where(Expr::col(UsersIden::Id).eq(user_id))
                    .take(),
            ),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_user_full_info(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column((UsersIden::Table, UsersIden::Id))
        .column((UsersIden::Table, UsersIden::Username))
        .column((UsersIden::Table, UsersIden::DefaultAssset))
        .expr_as(
            Expr::col((UsersIden::Table, UsersIden::Role)),
            Alias::new("role_id"),
        )
        .expr_as(
            Expr::col((UserRolesIden::Table, UserRolesIden::Name)),
            Alias::new("role_name"),
        )
        .from(UsersIden::Table)
        .inner_join(
            UserRolesIden::Table,
            Expr::col((UsersIden::Table, UsersIden::Role))
                .equals((UserRolesIden::Table, UserRolesIden::Id)),
        )
        .and_where(Expr::col((UsersIden::Table, UsersIden::Id)).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
