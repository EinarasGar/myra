use async_trait::async_trait;
use sea_query::{Alias, Expr, OnConflict, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::PgConnection;
use uuid::Uuid;

use crate::{
    idens::{
        asset_idens::{AssetTypesIden, AssetsIden},
        portfolio_idens::PortfolioIden,
        CommonsIden,
    },
    models::{portfolio_models::PortfolioCombined, transaction_models::AddTransactionModel},
};

#[async_trait]
pub trait PortfolioDbSet {
    async fn get_portfolio_with_asset_info(
        &mut self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<PortfolioCombined>>;
    async fn update_portfolio(
        &mut self,
        models: &Vec<AddTransactionModel>,
    ) -> Result<(), anyhow::Error>;
}

#[async_trait]
impl PortfolioDbSet for PgConnection {
    async fn get_portfolio_with_asset_info(
        &mut self,
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
            .fetch_all(&mut *self)
            .await?;
        Ok(rows)
    }

    async fn update_portfolio(
        &mut self,
        models: &Vec<AddTransactionModel>,
    ) -> Result<(), anyhow::Error> {
        let mut builder = Query::insert()
            .into_table(PortfolioIden::Table)
            .columns([
                PortfolioIden::UserId,
                PortfolioIden::AssetId,
                PortfolioIden::Sum,
            ])
            .on_conflict(
                OnConflict::columns([PortfolioIden::UserId, PortfolioIden::AssetId])
                    .value(
                        PortfolioIden::Sum,
                        //I dont like this what so ever, but sea-query doesnt have a better way to do it
                        Expr::col((PortfolioIden::Table, PortfolioIden::Sum))
                            .add(Expr::col((CommonsIden::Excluded, PortfolioIden::Sum))),
                    )
                    .to_owned(),
            )
            .to_owned();
        for model in models.clone().into_iter() {
            // where items is a vec of row's values
            builder.values_panic(vec![
                model.user_id.into(),
                model.asset_id.into(),
                model.quantity.into(),
            ]);
        }
        let (sql, values) = builder.build_sqlx(PostgresQueryBuilder);
        sqlx::query_with(&sql, values).execute(&mut *self).await?;
        Ok(())
    }
}
