use sea_query::{
    extension::postgres::PgExpr, Alias, Asterisk, Cond, Expr, Func, Order, PostgresQueryBuilder,
    Query,
};
use sea_query_binder::SqlxBinder;
use sqlx::types::{time::OffsetDateTime, Uuid};

use crate::{
    idens::asset_idens::{
        AssetHistoryIden, AssetPairsIden, AssetTypesIden, AssetsAliasIden, AssetsIden,
    },
    models::{
        asser_pair_rate_insert::AssetPairRateInsert, asset_models::InsertAsset,
        asset_pair::AssetPair,
    },
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn get_public_assets(page_length: u64, page: u64, search: Option<String>) -> DbQueryWithValues {
    let rows_to_skip = page_length * page;

    Query::select()
        .column((AssetsIden::Table, AssetsIden::Id))
        .column((AssetsIden::Table, AssetsIden::Name))
        .column((AssetsIden::Table, AssetsIden::Ticker))
        .column((AssetsIden::Table, AssetsIden::UserId))
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
        .and_where(Expr::col((AssetsIden::Table, AssetsIden::UserId)).is_null())
        .limit(page_length)
        .offset(rows_to_skip)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_users_assets(user_id: Uuid) -> DbQueryWithValues {
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
        .and_where(Expr::col((AssetsIden::Table, AssetsIden::UserId)).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_asset(id: i32) -> DbQueryWithValues {
    Query::select()
        .column((AssetsIden::Table, AssetsIden::Id))
        .column((AssetsIden::Table, AssetsIden::Name))
        .column((AssetsIden::Table, AssetsIden::Ticker))
        .column((AssetsIden::Table, AssetsIden::UserId))
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
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_pair_id(pair1: i32, pair2: i32) -> DbQueryWithValues {
    Query::select()
        .column((AssetPairsIden::Table, AssetPairsIden::Id))
        .from(AssetPairsIden::Table)
        .and_where(
            Expr::col(AssetPairsIden::Pair1)
                .eq(pair1)
                .and(Expr::col(AssetPairsIden::Pair2).eq(pair2)),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_latest_asset_pair_rates(
    pairs: Vec<AssetPair>,
    date_floor: Option<OffsetDateTime>,
    only_latest: bool,
) -> DbQueryWithValues {
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
                    |_q| {},
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
                    |_q| {},
                )
                .take(),
            AssetHistoryIden::Table,
            Expr::value(true),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_pair_rates(pair1: i32, pair2: i32) -> DbQueryWithValues {
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
        .into()
}

#[tracing::instrument(skip_all)]
pub fn insert_pair_rates(rates: Vec<AssetPairRateInsert>) -> DbQueryWithValues {
    let mut query_builder = Query::insert()
        .into_table(AssetHistoryIden::Table)
        .columns([
            AssetHistoryIden::PairId,
            AssetHistoryIden::Rate,
            AssetHistoryIden::Date,
        ])
        .to_owned();

    rates.into_iter().for_each(|rate| {
        query_builder.values_panic([rate.pair_id.into(), rate.rate.into(), rate.date.into()]);
    });

    query_builder.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn inser_pair(pair: AssetPair) -> DbQueryWithValues {
    Query::insert()
        .into_table(AssetPairsIden::Table)
        .columns([AssetPairsIden::Pair1, AssetPairsIden::Pair2])
        .values_panic([pair.pair1.into(), pair.pair2.into()])
        .returning_col(AssetPairsIden::Id)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn insert_asset(asset: InsertAsset) -> DbQueryWithValues {
    Query::insert()
        .into_table(AssetsIden::Table)
        .columns([
            AssetsIden::AssetType,
            AssetsIden::Name,
            AssetsIden::Ticker,
            AssetsIden::BasePairId,
            AssetsIden::UserId,
        ])
        .values_panic([
            asset.asset_type.into(),
            asset.name.into(),
            asset.ticker.into(),
            asset.base_pair_id.into(),
            asset.user_id.into(),
        ])
        .returning_col(AssetsIden::Id)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn asset_exists_by_id_and_user_id(asset_id: i32, user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .expr(Expr::exists(
            Query::select()
                .from(AssetsIden::Table)
                .and_where(Expr::col(AssetsIden::Id).eq(asset_id))
                .and_where(Expr::col(AssetsIden::UserId).eq(user_id))
                .take(),
        ))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn assets_count_by_ids_and_access(asset_ids: Vec<i32>, user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .expr(Expr::col(Asterisk).count())
        .from(AssetsIden::Table)
        .and_where(Expr::col(AssetsIden::Id).is_in(asset_ids))
        .and_where(
            Expr::col(AssetsIden::UserId)
                .eq(user_id)
                .or(Expr::col(AssetsIden::UserId).is_null()),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
