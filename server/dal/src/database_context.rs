use sqlx::postgres::PgPoolOptions;

use crate::db_sets::users::UsersDbSet;

#[derive(Clone)]
pub struct MyraDb {
    pub users_db_set: UsersDbSet,
}

impl MyraDb {
    pub async fn new() -> anyhow::Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect("postgres://myradev:6gb26udXkMKunEMm@localhost/myra")
            .await
            .expect("can't connect to database");

        let users_db_set: UsersDbSet = UsersDbSet::new(pool.clone());

        Ok(Self { users_db_set })
    }
}
