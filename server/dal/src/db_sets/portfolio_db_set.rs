use anyhow::bail;
use async_trait::async_trait;
use sea_query::{Alias, Expr, OnConflict, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::PgConnection;
use uuid::Uuid;

use crate::{
    idens::{
        asset_idens::{AssetTypesIden, AssetsIden},
        portfolio_idens::{PortfolioAccountIden, PortfolioIden},
        CommonsIden,
    },
    models::portfolio_models::{
        PortfolioAccountIdNameModel, PortfolioAccountModel, PortfolioCombined, PortfolioUpdateModel,
    },
};

#[async_trait]
pub trait PortfolioDbSet {
    async fn get_portfolio_with_asset_account_info(
        &mut self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<PortfolioCombined>>;
    async fn update_portfolio(
        &mut self,
        models: Vec<PortfolioUpdateModel>,
    ) -> Result<(), anyhow::Error>;
    async fn insert_or_update_portfolio_account(
        &mut self,
        models: PortfolioAccountModel,
    ) -> Result<(), anyhow::Error>;
    async fn get_portfolio_accounts_by_ids(
        &mut self,
        uuids: Vec<Uuid>,
    ) -> Result<Vec<PortfolioAccountIdNameModel>, anyhow::Error>;
}

#[async_trait]
impl PortfolioDbSet for PgConnection {
    async fn get_portfolio_with_asset_account_info(
        &mut self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<PortfolioCombined>> {
        let (sql, values) = Query::select()
            .column((PortfolioIden::Table, PortfolioIden::AssetId))
            .column((PortfolioIden::Table, PortfolioIden::Sum))
            .column((AssetsIden::Table, AssetsIden::Name))
            .column((AssetsIden::Table, AssetsIden::Ticker))
            .column((PortfolioIden::Table, PortfolioIden::AccountId))
            .expr_as(
                Expr::col((AssetTypesIden::Table, AssetTypesIden::Name)),
                Alias::new("category"),
            )
            .expr_as(
                Expr::col((PortfolioAccountIden::Table, PortfolioAccountIden::Name)),
                Alias::new("account_name"),
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
            .left_join(
                PortfolioAccountIden::Table,
                Expr::col((PortfolioIden::Table, PortfolioIden::AccountId))
                    .equals((PortfolioAccountIden::Table, PortfolioAccountIden::Id)),
            )
            .and_where(Expr::col((PortfolioIden::Table, PortfolioIden::UserId)).eq(user_id))
            .build_sqlx(PostgresQueryBuilder);

        let rows = sqlx::query_as_with::<_, PortfolioCombined, _>(&sql, values)
            .fetch_all(&mut *self)
            .await?;
        Ok(rows)
    }

    async fn update_portfolio(
        &mut self,
        models: Vec<PortfolioUpdateModel>,
    ) -> Result<(), anyhow::Error> {
        let mut builder = Query::insert()
            .into_table(PortfolioIden::Table)
            .columns([
                PortfolioIden::UserId,
                PortfolioIden::AssetId,
                PortfolioIden::AccountId,
                PortfolioIden::Sum,
            ])
            .on_conflict(
                OnConflict::columns([
                    PortfolioIden::UserId,
                    PortfolioIden::AssetId,
                    PortfolioIden::AccountId,
                ])
                .value(
                    PortfolioIden::Sum,
                    //I dont like this what so ever, but sea-query doesnt have a better way to do it
                    Expr::col((PortfolioIden::Table, PortfolioIden::Sum))
                        .add(Expr::col((CommonsIden::Excluded, PortfolioIden::Sum))),
                )
                .to_owned(),
            )
            .to_owned();

        for model in models.iter() {
            builder.values_panic(vec![
                model.user_id.to_owned().into(),
                model.asset_id.to_owned().into(),
                model.account_id.to_owned().into(),
                model.sum.to_owned().into(),
            ]);
        }

        let (sql, values) = builder.build_sqlx(PostgresQueryBuilder);
        sqlx::query_with(&sql, values).execute(&mut *self).await?;
        Ok(())
    }

    async fn insert_or_update_portfolio_account(
        &mut self,
        models: PortfolioAccountModel,
    ) -> Result<(), anyhow::Error> {
        let (sql, values) = Query::insert()
            .into_table(PortfolioAccountIden::Table)
            .columns([
                PortfolioAccountIden::Id,
                PortfolioAccountIden::UserId,
                PortfolioAccountIden::Name,
            ])
            .values_panic(vec![
                models.id.to_owned().into(),
                models.user_id.to_owned().into(),
                models.name.to_owned().into(),
            ])
            .on_conflict(
                OnConflict::column(PortfolioAccountIden::Id)
                    .update_columns([PortfolioAccountIden::Name])
                    .action_and_where(
                        Expr::col((PortfolioAccountIden::Table, PortfolioAccountIden::UserId)).eq(
                            Expr::col((CommonsIden::Excluded, PortfolioAccountIden::UserId)),
                        ),
                    )
                    .to_owned(),
            )
            .build_sqlx(PostgresQueryBuilder);
        let execution_result = sqlx::query_with(&sql, values).execute(&mut *self).await?;
        if execution_result.rows_affected() == 0 {
            bail!("Failed to insert or update portfolio account");
        }

        Ok(())
    }

    async fn get_portfolio_accounts_by_ids(
        &mut self,
        uuids: Vec<Uuid>,
    ) -> Result<Vec<PortfolioAccountIdNameModel>, anyhow::Error> {
        let (sql, values) = Query::select()
            .column((PortfolioAccountIden::Table, PortfolioAccountIden::Id))
            .column((PortfolioAccountIden::Table, PortfolioAccountIden::Name))
            .from(PortfolioAccountIden::Table)
            .and_where(Expr::col(PortfolioAccountIden::Id).is_in(uuids))
            .build_sqlx(PostgresQueryBuilder);

        let rows = sqlx::query_as_with::<_, PortfolioAccountIdNameModel, _>(&sql, values)
            .fetch_all(&mut *self)
            .await?;
        Ok(rows)
    }
}
