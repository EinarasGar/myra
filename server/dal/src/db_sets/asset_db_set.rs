use async_trait::async_trait;
use sea_query::{
    extension::postgres::PgExpr, Alias, Cond, Expr, Order, PostgresQueryBuilder, Query,
};
use sea_query_binder::SqlxBinder;
use sqlx::PgConnection;
use tracing::{debug_span, Instrument};

use crate::{
    idens::asset_idens::{AssetHistoryIden, AssetPairsIden, AssetTypesIden, AssetsIden},
    models::{
        asset_models::{Asset, AssetRaw},
        asset_pair::AssetPair,
        asset_pair_rate::AssetPairRate,
        asset_rate::AssetRate,
    },
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
    async fn get_latest_asset_pair_rates(
        &mut self,
        pairs: Vec<AssetPair>,
    ) -> anyhow::Result<Vec<AssetPairRate>>;
    async fn get_pair_rates(&mut self, pair1: i32, pair2: i32) -> anyhow::Result<Vec<AssetRate>>;
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

    #[tracing::instrument(skip(self))]
    async fn get_latest_asset_pair_rates(
        &mut self,
        pairs: Vec<AssetPair>,
    ) -> anyhow::Result<Vec<AssetPairRate>> {
        let tuples: Vec<(i32, i32)> = pairs.iter().map(|x| (x.pair1, x.pair2)).collect();
        let (sql, values) = Query::select()
            .column((AssetPairsIden::Table, AssetPairsIden::Pair1))
            .column((AssetPairsIden::Table, AssetPairsIden::Pair2))
            .column((AssetHistoryIden::Table, AssetHistoryIden::Rate))
            .column((AssetHistoryIden::Table, AssetHistoryIden::Date))
            .from(AssetPairsIden::Table)
            .join_lateral(
                sea_query::JoinType::Join,
                Query::select()
                    .columns([AssetHistoryIden::Rate, AssetHistoryIden::Date])
                    .from(AssetHistoryIden::Table)
                    .and_where(
                        Expr::col(AssetHistoryIden::PairId)
                            .equals((AssetPairsIden::Table, AssetPairsIden::Id)),
                    )
                    .order_by(AssetHistoryIden::Date, sea_query::Order::Desc)
                    .limit(1)
                    .take(),
                AssetHistoryIden::Table,
                Expr::value(true),
            )
            .and_where(
                Expr::tuple([
                    Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair1)).into(),
                    Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair2)).into(),
                ])
                .in_tuples(tuples),
            )
            .build_sqlx(PostgresQueryBuilder);

        let rows = sqlx::query_as_with::<_, AssetPairRate, _>(&sql, values.clone())
            .fetch_all(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok(rows)
    }

    async fn get_pair_rates(&mut self, pair1: i32, pair2: i32) -> anyhow::Result<Vec<AssetRate>> {
        let (sql, values) = Query::select()
            .column((AssetHistoryIden::Table, AssetHistoryIden::Rate))
            .column((AssetHistoryIden::Table, AssetHistoryIden::Date))
            .from(AssetHistoryIden::Table)
            .and_where(
                Expr::col(AssetHistoryIden::PairId).in_subquery(
                    Query::select()
                        .column(AssetPairsIden::Id)
                        .from(AssetPairsIden::Table)
                        .and_where(
                            Expr::col(AssetPairsIden::Pair1)
                                .eq(pair1)
                                .and(Expr::col(AssetPairsIden::Pair2).eq(pair2)),
                        )
                        .take(),
                ),
            )
            .order_by(AssetHistoryIden::Date, Order::Desc)
            .build_sqlx(PostgresQueryBuilder);

        let rows = sqlx::query_as_with::<_, AssetRate, _>(&sql, values.clone())
            .fetch_all(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok(rows)
    }
}
