use sqlx::postgres::PgPoolOptions;

use crate::db_sets::{
    portfolio::PortfolioDbSet, transactions::TransactionDbSet, users::UsersDbSet,
};

#[derive(Clone)]
pub struct MyraDb {
    pub users_db_set: UsersDbSet,
    pub transactions_db_set: TransactionDbSet,
    pub portfolio_db_set: PortfolioDbSet,
}

impl MyraDb {
    pub async fn new() -> anyhow::Result<Self> {
        let connection_string = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(&connection_string)
            .await
            .expect("can't connect to database");

        let users_db_set: UsersDbSet = UsersDbSet::new(pool.clone());
        let transactions_db_set: TransactionDbSet = TransactionDbSet::new(pool.clone());
        let portfolio_db_set: PortfolioDbSet = PortfolioDbSet::new(pool.clone());

        Ok(Self {
            users_db_set,
            transactions_db_set,
            portfolio_db_set,
        })
    }
}
