use sea_query::*;
use sea_query_binder::SqlxBinder;
use sqlx::{Pool, Postgres, Row};

use crate::models::user::{User, UserAuth, UserRoles, Users};

#[derive(Clone)]
pub struct UsersDbSet {
    pool: Pool<Postgres>,
}

impl UsersDbSet {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    pub async fn inset_user(&self, user: User) {
        let (sql, values) = Query::insert()
            .into_table(Users::Table)
            .columns([
                Users::Id,
                Users::Username,
                Users::Password,
                Users::DefaultAssset,
            ])
            .values_panic([
                user.id.into(),
                user.username.into(),
                user.password.into(),
                user.default_asset.into(),
            ])
            .build_sqlx(PostgresQueryBuilder);

        let _ = sqlx::query_with(&sql, values)
            .execute(&self.pool)
            .await
            .unwrap();
    }

    pub async fn get_user_auth_info(&self, username: String) -> anyhow::Result<UserAuth> {
        let (sql, values) = Query::select()
            .column((Users::Table, Users::Id))
            .column((Users::Table, Users::Password))
            .column((UserRoles::Table, UserRoles::Name))
            .from(Users::Table)
            .inner_join(
                UserRoles::Table,
                Expr::col((Users::Table, Users::Role)).equals((UserRoles::Table, UserRoles::Id)),
            )
            .and_where(Expr::col(Users::Username).eq(username))
            .build_sqlx(PostgresQueryBuilder);

        let row = sqlx::query_with(&sql, values).fetch_one(&self.pool).await?;

        Ok(UserAuth {
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
