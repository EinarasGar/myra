use sea_query_binder::SqlxValues;

pub mod asset_db_set;
pub mod portfolio_db_set;
pub mod transaction_db_set;
pub mod user_db_set;

#[derive(Debug)]
pub struct DbQueryWithValues {
    pub query: String,
    pub values: SqlxValues,
}

impl From<(String, SqlxValues)> for DbQueryWithValues {
    fn from(tuple: (String, SqlxValues)) -> Self {
        Self {
            query: tuple.0,
            values: tuple.1,
        }
    }
}
