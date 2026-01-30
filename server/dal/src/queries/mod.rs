use std::fmt::Debug;

use sea_query_sqlx::SqlxValues;

pub mod account_queries;
pub mod asset_queries;
pub mod category_queries;
pub mod category_type_queries;
pub mod entries_queries;
pub mod transaction_categories_queries;
pub mod transaction_data_queries;
pub mod transaction_queries;
pub mod user_queries;

pub struct DbQueryWithValues {
    pub query: String,
    pub values: SqlxValues,
}

impl Debug for DbQueryWithValues {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut query = self.query.replace("\\\"", "\"");

        let mut index = 1;
        self.values.0.iter().for_each(|value| {
            let value = value.to_string();
            query = query.replace(&format!("${}", index), &value);
            index += 1;
        });
        write!(f, "{}", query)
    }
}

impl From<(String, SqlxValues)> for DbQueryWithValues {
    fn from(tuple: (String, SqlxValues)) -> Self {
        Self {
            query: tuple.0,
            values: tuple.1,
        }
    }
}
