use sea_query::{extension::postgres::PgExpr, Alias, Cond, Expr, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::{Pool, Postgres};

use crate::{
    idens::asset_idens::{AssetTypesIden, AssetsIden},
    models::asset_models::{Asset, AssetRaw},
};

#[derive(Clone)]
pub struct AssetsDbSet {
    pool: Pool<Postgres>,
}

impl AssetsDbSet {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    pub async fn get_assets(
        &self,
        page_length: u64,
        page: u64,
        search: Option<String>,
    ) -> anyhow::Result<Vec<Asset>> {
        let rows_to_skip = page_length * page;

        let (sql, values) = Query::select()
            .column((AssetsIden::Table, AssetsIden::Id))
            .column((AssetsIden::Table, AssetsIden::Name))
            .column((AssetsIden::Table, AssetsIden::Ticker))
            .expr_as(
                Expr::col((AssetTypesIden::Table, AssetTypesIden::Name)),
                Alias::new("category"),
            )
            .from(AssetsIden::Table)
            .inner_join(
                AssetTypesIden::Table,
                Expr::col((AssetsIden::Table, AssetsIden::AssetType))
                    .equals((AssetTypesIden::Table, AssetTypesIden::Id)),
            )
            .conditions(
                search.is_some(),
                |q| {
                    q.cond_where(
                        Cond::any()
                            .add(
                                Expr::col((AssetsIden::Table, AssetsIden::Name))
                                    .ilike(format!("%{}%", search.clone().unwrap())),
                            )
                            .add(
                                Expr::col((AssetsIden::Table, AssetsIden::Ticker))
                                    .ilike(format!("%{}%", search.unwrap())),
                            ),
                    );
                },
                |_| {},
            )
            .limit(page_length)
            .offset(rows_to_skip)
            .build_sqlx(PostgresQueryBuilder);

        let rows = sqlx::query_as_with::<_, Asset, _>(&sql, values)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows)
    }

    pub async fn get_asset(&self, id: i32) -> anyhow::Result<Asset> {
        let (sql, values) = Query::select()
            .column((AssetsIden::Table, AssetsIden::Id))
            .column((AssetsIden::Table, AssetsIden::Name))
            .column((AssetsIden::Table, AssetsIden::Ticker))
            .expr_as(
                Expr::col((AssetTypesIden::Table, AssetTypesIden::Name)),
                Alias::new("category"),
            )
            .from(AssetsIden::Table)
            .inner_join(
                AssetTypesIden::Table,
                Expr::col((AssetsIden::Table, AssetsIden::AssetType))
                    .equals((AssetTypesIden::Table, AssetTypesIden::Id)),
            )
            .and_where(Expr::col((AssetsIden::Table, AssetsIden::Id)).eq(id))
            .build_sqlx(PostgresQueryBuilder);

        let rows = sqlx::query_as_with::<_, Asset, _>(&sql, values)
            .fetch_one(&self.pool)
            .await?;
        Ok(rows)
    }

    pub async fn insert_asset(&self, asset: AssetRaw) {
        let (sql, values) = Query::insert()
            .into_table(AssetsIden::Table)
            .columns([AssetsIden::AssetType, AssetsIden::Name, AssetsIden::Ticker])
            .values_panic([
                asset.asset_type.into(),
                asset.name.into(),
                asset.ticker.into(),
            ])
            .build_sqlx(PostgresQueryBuilder);
        sqlx::query_with(&sql, values)
            .execute(&self.pool)
            .await
            .unwrap();
    }
}

#[cfg(test)]
mod tests {
    use crate::{database_context, models::asset_models::AssetRaw};

    use reqwest::header::{ACCEPT, ACCEPT_ENCODING, ACCEPT_LANGUAGE, USER_AGENT};
    use serde::Deserialize;
    use serde_json::Value;

    #[derive(Deserialize, Debug)]
    pub struct NasdaqData {
        symbol: String,
        name: String,
    }

    #[tokio::test]
    async fn add_stocks_to_db() {
        let context = database_context::MyraDb::new().await.unwrap();

        let client = reqwest::Client::new();
        let response = client
            .get("http://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=25&download=true")
            .header(
                USER_AGENT,
                "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/110.0",
            )
            .header(ACCEPT, "application/json, text/plain, */*")
            .header(ACCEPT_LANGUAGE, "en-US,en;q=0.5")
            .header(ACCEPT_ENCODING, "deflate")
            .send()
            .await
            .unwrap();

        let data = response.text().await.unwrap();
        let json: Value = serde_json::from_str(&data).unwrap();

        let stocks: Vec<NasdaqData> = serde_json::from_value(json["data"]["rows"].clone()).unwrap();

        for stock in stocks.into_iter() {
            println!("{} {}", stock.name, stock.symbol);

            context
                .assets_db_set
                .insert_asset(AssetRaw {
                    ticker: stock.symbol,
                    name: stock.name,
                    asset_type: 2,
                    id: 0,
                })
                .await;
        }
    }
}
