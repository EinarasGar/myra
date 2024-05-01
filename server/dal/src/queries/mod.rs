use sea_query_binder::SqlxValues;

pub mod asset_queries;
pub mod entries_queries;
pub mod portfolio_queries;
pub mod transaction_data_queries;
pub mod transaction_queries;
pub mod user_queries;

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
