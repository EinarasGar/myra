use sqlx::{postgres::PgRow, FromRow};

#[derive(sqlx::FromRow)]
pub struct TotalCount<T>
where
    for<'r> T: FromRow<'r, PgRow>,
{
    #[sqlx(flatten)]
    pub model: T,

    pub total_results: i64,
}
