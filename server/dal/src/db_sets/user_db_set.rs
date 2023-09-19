use async_trait::async_trait;
use mockall::automock;
use sea_query::*;
use sea_query_binder::SqlxBinder;
use sqlx::{types::Uuid, PgConnection, Row};
use tracing::{debug_span, Instrument};

use crate::{
    idens::user_idens::{UserRolesIden, UsersIden},
    models::user_models::{AddUserModel, UserAuthModel, UserFullModel, UserRoleModel},
};

#[async_trait]
pub trait UsersDbSet {
    async fn inset_user(&mut self, user: AddUserModel) -> anyhow::Result<()>;
    async fn get_user_auth_info(&mut self, username: String) -> anyhow::Result<UserAuthModel>;
    async fn get_user_role(&mut self, user_id: Uuid) -> anyhow::Result<UserRoleModel>;
    async fn get_user_full_info(&mut self, user_id: Uuid) -> anyhow::Result<UserFullModel>;
}

#[automock]
#[async_trait]
impl UsersDbSet for PgConnection {
    #[tracing::instrument(skip(self), ret, err)]
    async fn inset_user(&mut self, user: AddUserModel) -> anyhow::Result<()> {
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

        sqlx::query_with(&sql, values.clone())
            .execute(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok(())
    }

    #[tracing::instrument(skip(self), ret, err)]
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

        let row = sqlx::query_with(&sql, values.clone())
            .fetch_one(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;

        Ok(UserAuthModel {
            id: row.try_get(0)?,
            password: row.try_get(1)?,
            role: row.try_get(2)?,
        })
    }

    #[tracing::instrument(skip(self), ret, err)]
    async fn get_user_role(&mut self, user_id: Uuid) -> anyhow::Result<UserRoleModel> {
        let sql =
            "SELECT id, name FROM user_roles WHERE id in (SELECT role from users where id = $1)";

        let row = sqlx::query(sql)
            .bind(user_id)
            .fetch_one(&mut *self)
            .instrument(debug_span!("query", sql, ?user_id))
            .await?;

        Ok(UserRoleModel {
            id: row.try_get(0)?,
            name: row.try_get(1)?,
        })
    }

    #[tracing::instrument(skip(self), ret, err)]
    async fn get_user_full_info(&mut self, user_id: Uuid) -> anyhow::Result<UserFullModel> {
        let (sql, values) = Query::select()
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
            .build_sqlx(PostgresQueryBuilder);

        let row = sqlx::query_as_with::<_, UserFullModel, _>(&sql, values.clone())
            .fetch_one(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;

        Ok(row)
    }
}
