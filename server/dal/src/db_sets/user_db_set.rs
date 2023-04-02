use sea_query::*;
use sea_query_binder::SqlxBinder;
use sqlx::{Pool, Postgres, Row};

use crate::{
    idens::user_idens::{UserRolesIden, UsersIden},
    models::user_models::{UserAuthModel, UserModel},
};

#[derive(Clone)]
pub struct UsersDbSet {
    pool: Pool<Postgres>,
}

impl UsersDbSet {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    pub async fn inset_user(&self, user: UserModel) -> anyhow::Result<()> {
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

        sqlx::query_with(&sql, values).execute(&self.pool).await?;
        Ok(())
    }

    pub async fn get_user_auth_info(&self, username: String) -> anyhow::Result<UserAuthModel> {
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

        let row = sqlx::query_with(&sql, values).fetch_one(&self.pool).await?;

        Ok(UserAuthModel {
            id: row.try_get(0)?,
            password: row.try_get(1)?,
            role: row.try_get(2)?,
        })
    }
}

#[cfg(test)]
mod tests {
    use crate::database_context;

    #[tokio::test]
    async fn test_get_user_counttt() {
        //arrange
        let context = database_context::MyraDb::new().await.unwrap();

        //act
        let user_auth_object = context
            .users_db_set
            .get_user_auth_info("einaras".to_string())
            .await
            .unwrap();

        //assert
        assert_eq!("Admin", user_auth_object.role);
    }
}
