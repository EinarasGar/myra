use sqlx::{postgres::PgRow, FromRow};

#[derive(Clone, Debug, FromRow)]
pub struct Count {
    pub count: i64,
}

#[derive(Clone, Debug, FromRow)]
pub struct Exsists {
    pub exists: bool,
}

#[derive(FromRow, Debug)]
pub struct TotalCount<T>
where
    for<'r> T: FromRow<'r, PgRow>,
{
    #[sqlx(flatten)]
    pub model: T,

    pub total_results: i64,
}
