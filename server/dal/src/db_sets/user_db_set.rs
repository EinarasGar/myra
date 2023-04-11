use async_trait::async_trait;
use sea_query::*;
use sea_query_binder::SqlxBinder;
use sqlx::{PgConnection, Row};

use crate::{
    idens::user_idens::{UserRolesIden, UsersIden},
    models::user_models::{UserAuthModel, UserModel},
};

#[async_trait]
pub trait UsersDbSet {
    async fn inset_user(&mut self, user: UserModel) -> anyhow::Result<()>;
    async fn get_user_auth_info(&mut self, username: String) -> anyhow::Result<UserAuthModel>;
}

#[async_trait]
impl UsersDbSet for PgConnection {
    async fn inset_user(&mut self, user: UserModel) -> anyhow::Result<()> {
        let (sql, values) = Query::insert()
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
            .build_sqlx(PostgresQueryBuilder);

        sqlx::query_with(&sql, values).execute(&mut *self).await?;
        Ok(())
    }

    async fn get_user_auth_info(&mut self, username: String) -> anyhow::Result<UserAuthModel> {
        let (sql, values) = Query::select()
            .column((UsersIden::Table, UsersIden::Id))
            .column((UsersIden::Table, UsersIden::Password))
            .column((UserRolesIden::Table, UserRolesIden::Name))
            .from(UsersIden::Table)
            .inner_join(
                UserRolesIden::Table,
                Expr::col((UsersIden::Table, UsersIden::Role))
                    .equals((UserRolesIden::Table, UserRolesIden::Id)),
            )
            .and_where(Expr::col(UsersIden::Username).eq(username))
            .build_sqlx(PostgresQueryBuilder);

        let row = sqlx::query_with(&sql, values).fetch_one(&mut *self).await?;

        Ok(UserAuthModel {
            id: row.try_get(0)?,
            password: row.try_get(1)?,
            role: row.try_get(2)?,
        })
    }
}
