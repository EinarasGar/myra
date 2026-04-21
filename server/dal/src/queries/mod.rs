use std::fmt::Debug;

use sea_query_sqlx::SqlxValues;

pub mod account_queries;
pub mod ai_queries;
pub mod asset_queries;
pub mod category_queries;
pub mod category_type_queries;
pub mod entries_queries;
pub mod file_queries;
pub mod rate_limit_queries;
pub mod rate_limit_redis_queries;
pub mod transaction_categories_queries;
pub mod transaction_data_queries;
pub mod transaction_group_queries;
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

pub struct DbCopyCommand {
    pub statement: String,
    pub csv_data: Vec<u8>,
}

impl Debug for DbCopyCommand {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} ({} bytes)", self.statement, self.csv_data.len())
    }
}

/// Escapes ILIKE metacharacters (% and _) in a search string and wraps it in %...% for partial matching.
pub fn escape_ilike_pattern(query: &str) -> String {
    let escaped = query
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_");
    format!("%{}%", escaped)
}
