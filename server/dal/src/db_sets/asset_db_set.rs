use async_trait::async_trait;
use mockall::automock;
use sea_query::{
    extension::postgres::PgExpr, Alias, Cond, Expr, Func, Order, PostgresQueryBuilder, Query,
};
use sea_query_binder::{SqlxBinder, SqlxValues};
use sqlx::{
    types::time::{Date, OffsetDateTime},
    PgConnection,
};
use tracing::{debug_span, Instrument};

use crate::{
    idens::asset_idens::{
        AssetHistoryIden, AssetPairsIden, AssetTypesIden, AssetsAliasIden, AssetsIden,
    },
    models::{
        asset_models::{Asset, AssetRaw},
        asset_pair::AssetPair,
        asset_pair_rate::AssetPairRate,
        asset_rate::AssetRate,
    },
};

// #[automock]
// #[async_trait]
// pub trait AssetDbSet {
//     pub fn get_assets(
//         page_length: u64,
//         page: u64,
//         search: Option<String>,
//     ) -> anyhow::Result<Vec<Asset>>;
//     pub fn get_asset(id: i32) -> anyhow::Result<Asset>;
//     pub fn insert_asset(asset: AssetRaw);
//     pub fn get_latest_asset_pair_rates(
//         pairs: Vec<AssetPair>,
//         date_floor: Option<OffsetDateTime>,
//         only_latest: bool,
//     ) -> anyhow::Result<Vec<AssetPairRate>>;
//     pub fn get_pair_rates(pair1: i32, pair2: i32) -> anyhow::Result<Vec<AssetRate>>;
//     pub fn insert_pair_rate(rate: AssetPairRate) -> anyhow::Result<()>;
// }

// #[async_trait]
// impl AssetDbSet {
#[tracing::instrument(ret)]
pub fn get_assets(page_length: u64, page: u64, search: Option<String>) -> (String, SqlxValues) {
    let rows_to_skip = page_length * page;

    Query::select()
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
        .build_sqlx(PostgresQueryBuilder)

    // let rows = sqlx::query_as_with::<_, Asset, _>(&sql, values.clone())
    //     .fetch_all(&mut *self)
    //     .instrument(debug_span!("query", sql, ?values))
    //     .await?;
}

#[tracing::instrument(ret)]
pub fn get_asset(id: i32) -> (String, SqlxValues) {
    Query::select()
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
        .build_sqlx(PostgresQueryBuilder)

    // let rows = sqlx::query_as_with::<_, Asset, _>(&sql, values.clone())
    //     .fetch_one(&mut *self)
    //     .instrument(debug_span!("query", sql, ?values))
    //     .await?;
}

#[tracing::instrument()]
pub fn insert_asset(asset: AssetRaw) -> (String, SqlxValues) {
    Query::insert()
        .into_table(AssetsIden::Table)
        .columns([AssetsIden::AssetType, AssetsIden::Name, AssetsIden::Ticker])
        .values_panic([
            asset.asset_type.into(),
            asset.name.into(),
            asset.ticker.into(),
        ])
        .build_sqlx(PostgresQueryBuilder)

    // sqlx::query_with(&sql, values.clone())
    //     .execute(&mut *self)
    //     .instrument(debug_span!("query", sql, ?values))
    //     .await
    //     .unwrap();
}

#[tracing::instrument()]
pub fn get_latest_asset_pair_rates(
    pairs: Vec<AssetPair>,
    date_floor: Option<OffsetDateTime>,
    only_latest: bool,
) -> (String, SqlxValues) {
    let tuples: Vec<(i32, i32)> = pairs.iter().map(|x| (x.pair1, x.pair2)).collect();
    let base_main_ids: Vec<i32> = pairs.iter().map(|x| x.pair1).collect();

    let base_pairs_query = Query::select()
        .column((AssetPairsIden::Table, AssetPairsIden::Id))
        .column((AssetPairsIden::Table, AssetPairsIden::Pair1))
        .column((AssetPairsIden::Table, AssetPairsIden::Pair2))
        .from(AssetPairsIden::Table)
        .join(
            sea_query::JoinType::Join,
            AssetsIden::Table,
            Expr::col((AssetsIden::Table, AssetsIden::Id))
                .equals((AssetPairsIden::Table, AssetPairsIden::Pair1)),
        )
        .and_where(Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair1)).is_in(base_main_ids))
        .and_where(
            Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair2))
                .equals((AssetsIden::Table, AssetsIden::BasePairId)),
        )
        .to_owned();

    let pairs_query = Query::select()
        .column((AssetPairsIden::Table, AssetPairsIden::Id))
        .column((AssetPairsIden::Table, AssetPairsIden::Pair1))
        .column((AssetPairsIden::Table, AssetPairsIden::Pair2))
        .from(AssetPairsIden::Table)
        .and_where(
            Expr::tuple([
                Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair1)).into(),
                Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair2)).into(),
            ])
            .in_tuples(tuples),
        )
        .to_owned();

    let filtered_query = Query::select()
        .expr_as(
            Func::coalesce([
                Expr::col((AssetsAliasIden::PairsSubquery, AssetPairsIden::Pair1)).into(),
                Expr::col((AssetsAliasIden::BasePairsSubquery, AssetPairsIden::Pair1)).into(),
            ]),
            AssetPairsIden::Pair1,
        )
        .expr_as(
            Func::coalesce([
                Expr::col((AssetsAliasIden::PairsSubquery, AssetPairsIden::Pair2)).into(),
                Expr::col((AssetsAliasIden::BasePairsSubquery, AssetPairsIden::Pair2)).into(),
            ]),
            AssetPairsIden::Pair2,
        )
        .expr_as(
            Func::coalesce([
                Expr::col((AssetsAliasIden::PairsSubquery, AssetPairsIden::Id)).into(),
                Expr::col((AssetsAliasIden::BasePairsSubquery, AssetPairsIden::Id)).into(),
            ]),
            AssetPairsIden::Id,
        )
        .from_subquery(base_pairs_query, AssetsAliasIden::BasePairsSubquery)
        .join_subquery(
            sea_query::JoinType::FullOuterJoin,
            pairs_query,
            AssetsAliasIden::PairsSubquery,
            Expr::col((AssetsAliasIden::PairsSubquery, AssetPairsIden::Pair1))
                .equals((AssetsAliasIden::BasePairsSubquery, AssetPairsIden::Pair1)),
        )
        .to_owned();

    Query::select()
        .column((
            AssetsAliasIden::FilteredPairsSubquery,
            AssetPairsIden::Pair1,
        ))
        .column((
            AssetsAliasIden::FilteredPairsSubquery,
            AssetPairsIden::Pair2,
        ))
        .column((AssetHistoryIden::Table, AssetHistoryIden::Rate))
        .column((AssetHistoryIden::Table, AssetHistoryIden::Date))
        .from_subquery(filtered_query, AssetsAliasIden::FilteredPairsSubquery)
        .join_lateral(
            sea_query::JoinType::Join,
            Query::select()
                .columns([AssetHistoryIden::Rate, AssetHistoryIden::Date])
                .from(AssetHistoryIden::Table)
                .and_where(
                    Expr::col(AssetHistoryIden::PairId)
                        .equals((AssetsAliasIden::FilteredPairsSubquery, AssetPairsIden::Id)),
                )
                .conditions(
                    only_latest,
                    // if condition is true then add the following condition
                    |q| {
                        q.limit(1)
                            .order_by(AssetHistoryIden::Date, sea_query::Order::Desc);
                    },
                    // otherwise leave it as is
                    |q| {},
                )
                .conditions(
                    date_floor.is_some(), // if condition is true then add the following condition
                    |q| {
                        q.and_where(
                            Expr::col(AssetHistoryIden::Date).gte(Expr::val(date_floor.unwrap())),
                        )
                        .order_by(AssetHistoryIden::Date, sea_query::Order::Asc);
                    },
                    // otherwise leave it as is
                    |q| {},
                )
                .take(),
            AssetHistoryIden::Table,
            Expr::value(true),
        )
        .build_sqlx(PostgresQueryBuilder)

    // let rows = sqlx::query_as_with::<_, AssetPairRate, _>(&sql, values.clone())
    //     .fetch_all(&mut *self)
    //     .instrument(debug_span!("query", sql, ?values))
    //     .await?;
    // Ok(rows)
}

#[tracing::instrument()]
pub fn get_pair_rates(pair1: i32, pair2: i32) -> (String, SqlxValues) {
    Query::select()
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
        .build_sqlx(PostgresQueryBuilder)

    // let rows = sqlx::query_as_with::<_, AssetRate, _>(&sql, values.clone())
    //     .fetch_all(&mut *self)
    //     .instrument(debug_span!("query", sql, ?values))
    //     .await?;
    // Ok(rows)
}

#[tracing::instrument()]
pub fn insert_pair_rate(rate: AssetPairRate) -> (String, SqlxValues) {
    Query::insert()
        .into_table(AssetHistoryIden::Table)
        .columns([
            AssetHistoryIden::PairId,
            AssetHistoryIden::Rate,
            AssetHistoryIden::Date,
        ])
        .values_panic([8.into(), rate.rate.into(), rate.date.into()])
        .build_sqlx(PostgresQueryBuilder)

    // sqlx::query_with(&sql, values.clone())
    //     .execute(&mut *self)
    //     .instrument(debug_span!("query", sql, ?values))
    //     .await?;
    // Ok(())
}
// }
