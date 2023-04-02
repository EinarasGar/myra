use sea_query::{Alias, Expr, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::{Pool, Postgres};
use uuid::Uuid;

use crate::{
    idens::{
        asset_idens::{AssetTypesIden, AssetsIden},
        portfolio_idens::PortfolioIden,
    },
    models::portfolio_models::PortfolioCombined,
};

#[derive(Clone)]
pub struct PortfolioDbSet {
    pool: Pool<Postgres>,
}

impl PortfolioDbSet {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    pub async fn get_portfolio_with_asset_info(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<PortfolioCombined>> {
        let (sql, values) = Query::select()
            .column((PortfolioIden::Table, PortfolioIden::AssetId))
            .column((PortfolioIden::Table, PortfolioIden::Sum))
            .column((AssetsIden::Table, AssetsIden::Name))
            .column((AssetsIden::Table, AssetsIden::Ticker))
            .expr_as(
                Expr::col((AssetTypesIden::Table, AssetTypesIden::Name)),
                Alias::new("category"),
            )
            .from(PortfolioIden::Table)
            .inner_join(
                AssetsIden::Table,
                Expr::col((PortfolioIden::Table, PortfolioIden::AssetId))
                    .equals((AssetsIden::Table, AssetsIden::Id)),
            )
            .inner_join(
                AssetTypesIden::Table,
                Expr::col((AssetsIden::Table, AssetsIden::AssetType))
                    .equals((AssetTypesIden::Table, AssetTypesIden::Id)),
            )
            .and_where(Expr::col(PortfolioIden::UserId).eq(user_id))
            .build_sqlx(PostgresQueryBuilder);

        let rows = sqlx::query_as_with::<_, PortfolioCombined, _>(&sql, values)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows)
    }
}
