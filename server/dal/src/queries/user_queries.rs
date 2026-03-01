use sea_query::*;
use sea_query_sqlx::SqlxBinder;
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
            UsersIden::Username,
            UsersIden::PasswordHash,
            UsersIden::DefaultAssset,
        ])
        .values_panic([
            user.username.into(),
            user.password.into(),
            user.default_asset.into(),
        ])
        .returning_col(UsersIden::Id)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_user_auth_info(username: String) -> DbQueryWithValues {
    Query::select()
        .column((UsersIden::Table, UsersIden::Id))
        .column((UsersIden::Table, UsersIden::PasswordHash))
        .expr_as(
            Expr::col((UserRolesIden::Table, UserRolesIden::RoleName)),
            Alias::new("user_role_name"),
        )
        .from(UsersIden::Table)
        .inner_join(
            UserRolesIden::Table,
            Expr::col((UsersIden::Table, UsersIden::UserRole))
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
        .column(UserRolesIden::RoleName)
        .from(UserRolesIden::Table)
        .and_where(
            Expr::col(UserRolesIden::Id).in_subquery(
                Query::select()
                    .column(UsersIden::UserRole)
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
        .column((UserRolesIden::Table, UserRolesIden::RoleName))
        .expr_as(
            Expr::col((UsersIden::Table, UsersIden::UserRole)),
            Alias::new("role_id"),
        )
        .from(UsersIden::Table)
        .inner_join(
            UserRolesIden::Table,
            Expr::col((UsersIden::Table, UsersIden::UserRole))
                .equals((UserRolesIden::Table, UserRolesIden::Id)),
        )
        .and_where(Expr::col((UsersIden::Table, UsersIden::Id)).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
