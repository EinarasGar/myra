use async_trait::async_trait;
use sea_query::{extension::postgres::PgExpr, Alias, Cond, Expr, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::PgConnection;
use tracing::{debug_span, Instrument};

use crate::{
    idens::asset_idens::{AssetTypesIden, AssetsIden},
    models::asset_models::{Asset, AssetRaw},
};

#[async_trait]
pub trait AssetDbSet {
    async fn get_assets(
        &mut self,
        page_length: u64,
        page: u64,
        search: Option<String>,
    ) -> anyhow::Result<Vec<Asset>>;
    async fn get_asset(&mut self, id: i32) -> anyhow::Result<Asset>;
    async fn insert_asset(&mut self, asset: AssetRaw);
}

#[async_trait]
impl AssetDbSet for PgConnection {
    #[tracing::instrument(skip(self), ret, err)]
    async fn get_assets(
        &mut self,
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

        let rows = sqlx::query_as_with::<_, Asset, _>(&sql, values.clone())
            .fetch_all(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok(rows)
    }

    #[tracing::instrument(skip(self), ret, err)]
    async fn get_asset(&mut self, id: i32) -> anyhow::Result<Asset> {
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

        let rows = sqlx::query_as_with::<_, Asset, _>(&sql, values.clone())
            .fetch_one(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok(rows)
    }

    #[tracing::instrument(skip(self))]
    async fn insert_asset(&mut self, asset: AssetRaw) {
        let (sql, values) = Query::insert()
            .into_table(AssetsIden::Table)
            .columns([AssetsIden::AssetType, AssetsIden::Name, AssetsIden::Ticker])
            .values_panic([
                asset.asset_type.into(),
                asset.name.into(),
                asset.ticker.into(),
            ])
            .build_sqlx(PostgresQueryBuilder);

        sqlx::query_with(&sql, values.clone())
            .execute(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await
            .unwrap();
    }
}
