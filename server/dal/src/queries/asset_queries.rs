use std::collections::HashMap;

use sea_query::{
    extension::postgres::PgExpr, Alias, Asterisk, CommonTableExpression, Cond, Expr, Func, Order,
    PostgresQueryBuilder, Query, SimpleExpr, Value, WindowStatement, WithClause,
};
use sea_query_binder::SqlxBinder;
use sqlx::types::{time::OffsetDateTime, Uuid};
use time::Duration;

use crate::{
    idens::{
        asset_idens::{
            AssetHistoryCalculationIden, AssetHistoryIden, AssetPairSharedMetadataIden,
            AssetPairsIden, AssetTypesIden, AssetsAliasIden, AssetsIden,
        },
        ArrayFunc, CustomFunc, Unnest,
    },
    models::asset_models::{AssetPair, AssetPairDate, AssetPairRateInsert, InsertAsset},
    query_params::{
        get_assets_params::{GetAssetsParams, GetAssetsParamsSeachType},
        get_rates_params::{GetRatesParams, GetRatesSeachType},
    },
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn get_public_assets(page_length: u64, page: u64, search: Option<String>) -> DbQueryWithValues {
    let rows_to_skip = page_length * page;

    Query::select()
        .column((AssetsIden::Table, AssetsIden::Id))
        .column((AssetsIden::Table, AssetsIden::AssetName))
        .column((AssetsIden::Table, AssetsIden::Ticker))
        .column((AssetsIden::Table, AssetsIden::UserId))
        .expr_as(
            Expr::col((AssetTypesIden::Table, AssetTypesIden::AssetTypeName)),
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
                            Expr::col((AssetsIden::Table, AssetsIden::AssetName))
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
        .column((AssetsIden::Table, AssetsIden::AssetName))
        .column((AssetsIden::Table, AssetsIden::Ticker))
        .expr_as(
            Expr::col((AssetTypesIden::Table, AssetTypesIden::AssetTypeName)),
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
pub fn get_asset_with_metadata(params: GetAssetsParams) -> DbQueryWithValues {
    let mut get_assets_builder = Query::select()
        .column((AssetsIden::Table, AssetsIden::Id))
        .column((AssetsIden::Table, AssetsIden::AssetName))
        .column((AssetsIden::Table, AssetsIden::AssetType))
        .column((AssetsIden::Table, AssetsIden::Ticker))
        .column((AssetsIden::Table, AssetsIden::UserId))
        .column((AssetTypesIden::Table, AssetTypesIden::AssetTypeName))
        .conditions(
            params.include_metadata,
            |q| {
                let sub_select = Query::select()
                    .column(AssetPairsIden::Pair2)
                    .from(AssetPairsIden::Table)
                    .and_where(
                        Expr::col(AssetPairsIden::Pair1)
                            .eq(Expr::col((AssetsIden::Table, AssetsIden::Id))),
                    )
                    .to_owned();

                q.column((AssetsIden::Table, AssetsIden::BasePairId))
                    .expr_as(
                        Func::cust(ArrayFunc).arg(SimpleExpr::SubQuery(
                            None,
                            Box::new(sub_select.into_sub_query_statement()),
                        )),
                        Alias::new("pairs"),
                    );
            },
            |_q| {},
        )
        .conditions(
            params.paging.is_some(),
            |q| {
                q.expr_window_as(
                    Expr::col(Asterisk).count(),
                    WindowStatement::default(),
                    Alias::new("total_results"),
                );
            },
            |_q| {},
        )
        .from(AssetsIden::Table)
        .inner_join(
            AssetTypesIden::Table,
            Expr::col((AssetsIden::Table, AssetsIden::AssetType))
                .equals((AssetTypesIden::Table, AssetTypesIden::Id)),
        )
        .to_owned();

    match params.search_type {
        GetAssetsParamsSeachType::ById(pair1) => {
            get_assets_builder.and_where(Expr::col((AssetsIden::Table, AssetsIden::Id)).eq(pair1));
        }
        GetAssetsParamsSeachType::ByIds(ids) => {
            get_assets_builder.and_where(Expr::col((AssetsIden::Table, AssetsIden::Id)).is_in(ids));
        }
        GetAssetsParamsSeachType::ByPairId(pair1, pair2) => {
            get_assets_builder.and_where(
                Expr::col((AssetsIden::Table, AssetsIden::Id))
                    .eq(pair1)
                    .or(Expr::col((AssetsIden::Table, AssetsIden::Id)).eq(pair2)),
            );
        }
        GetAssetsParamsSeachType::All => {}
        GetAssetsParamsSeachType::ByQuery(_query) => todo!(),
    };

    if let Some(paging) = params.paging {
        get_assets_builder.limit(paging.count).offset(paging.start);
    }

    get_assets_builder.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn get_rates(params: GetRatesParams) -> DbQueryWithValues {
    let mut builder = Query::select()
        .column((AssetHistoryIden::Table, AssetHistoryIden::Rate))
        .column((AssetHistoryIden::Table, AssetHistoryIden::RecordedAt))
        .from(AssetHistoryIden::Table)
        .join(
            sea_query::JoinType::Join,
            AssetPairsIden::Table,
            Expr::col((AssetHistoryIden::Table, AssetHistoryIden::PairId))
                .equals((AssetPairsIden::Table, AssetPairsIden::Id)),
        )
        .to_owned();

    match params.search_type {
        GetRatesSeachType::ByPair(pair1, pair2) => {
            builder.and_where(
                Expr::tuple([
                    Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair1)).into(),
                    Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair2)).into(),
                ])
                .eq(Expr::tuple([Expr::value(pair1), Expr::value(pair2)])),
            );
        }
        GetRatesSeachType::All => todo!(),
        GetRatesSeachType::ByPairs(_hash_set) => todo!(),
    }

    if let Some(interval) = params.interval {
        builder
            .and_where(Expr::col(AssetHistoryIden::RecordedAt).lte(interval.end_date))
            .and_where(Expr::col(AssetHistoryIden::RecordedAt).gte(interval.start_date));
    }

    if let Some(limit) = params.limit {
        builder.limit(limit);
    }

    builder
        .order_by(AssetHistoryIden::RecordedAt, Order::Desc)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

/// ```sql
/// SELECT volume
/// FROM asset_pairs_shared_metadata m
///     JOIN asset_pairs p ON m.pair_id = p.id
/// WHERE (p.pair1, p.pair2) IN ((4, 1), (5, 2), (6, 3))
/// ```
#[tracing::instrument(skip_all)]
pub fn get_shared_asset_pair_metadata(pairs: Vec<AssetPair>) -> DbQueryWithValues {
    let tuples: Vec<(i32, i32)> = pairs.iter().map(|x| (x.pair1, x.pair2)).collect();
    Query::select()
        .column((
            AssetPairSharedMetadataIden::Table,
            AssetPairSharedMetadataIden::Volume,
        ))
        .from(AssetPairSharedMetadataIden::Table)
        .inner_join(
            AssetPairsIden::Table,
            Expr::col((
                AssetPairSharedMetadataIden::Table,
                AssetPairSharedMetadataIden::Id,
            ))
            .equals((AssetPairsIden::Table, AssetPairsIden::Id)),
        )
        .and_where(
            Expr::tuple([
                Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair1)).into(),
                Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair2)).into(),
            ])
            .in_tuples(tuples),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_asset(id: i32) -> DbQueryWithValues {
    Query::select()
        .column((AssetsIden::Table, AssetsIden::Id))
        .column((AssetsIden::Table, AssetsIden::AssetName))
        .column((AssetsIden::Table, AssetsIden::AssetType))
        .column((AssetsIden::Table, AssetsIden::Ticker))
        .column((AssetsIden::Table, AssetsIden::UserId))
        .column((AssetTypesIden::Table, AssetTypesIden::AssetTypeName))
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
pub fn insert_pair_rates(rates: Vec<AssetPairRateInsert>) -> DbQueryWithValues {
    let mut query_builder = Query::insert()
        .into_table(AssetHistoryIden::Table)
        .columns([
            AssetHistoryIden::PairId,
            AssetHistoryIden::Rate,
            AssetHistoryIden::RecordedAt,
        ])
        .to_owned();

    rates.into_iter().for_each(|rate| {
        query_builder.values_panic([
            rate.pair_id.into(),
            rate.rate.into(),
            rate.recorded_at.into(),
        ]);
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
            AssetsIden::AssetName,
            AssetsIden::Ticker,
            AssetsIden::BasePairId,
            AssetsIden::UserId,
        ])
        .values_panic([
            asset.asset_type.into(),
            asset.asset_name.into(),
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

#[tracing::instrument(skip_all)]
pub fn get_assets_raw() -> DbQueryWithValues {
    Query::select()
        .column((AssetsIden::Table, AssetsIden::Id))
        .column((AssetsIden::Table, AssetsIden::AssetType))
        .column((AssetsIden::Table, AssetsIden::AssetName))
        .column((AssetsIden::Table, AssetsIden::Ticker))
        .column((AssetsIden::Table, AssetsIden::BasePairId))
        .column((AssetsIden::Table, AssetsIden::UserId))
        .from(AssetsIden::Table)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

/// This query finds either direct asset pair or fall back to base relationship pair
/// And then gets the latest rate for that pair
///
/// ```sql
/// SELECT "filtered"."pair1",
///     "filtered"."pair2",
///     "asset_history"."rate",
///     "asset_history"."recorded_at"
/// FROM (
///         SELECT COALESCE("pairs"."pair1", "base_pairs"."pair1") AS "pair1",
///             COALESCE("pairs"."pair2", "base_pairs"."pair2") AS "pair2",
///             COALESCE("pairs"."id", "base_pairs"."id") AS "id"
///         FROM (
///                 SELECT "asset_pairs"."id",
///                     "asset_pairs"."pair1",
///                     "asset_pairs"."pair2"
///                 FROM "asset_pairs"
///                     JOIN "assets" ON "assets"."id" = "asset_pairs"."pair1"
///                 WHERE "asset_pairs"."pair1" IN (5)
///                     AND "asset_pairs"."pair2" = "assets"."base_pair_id"
///             ) AS "base_pairs"
///             FULL OUTER JOIN (
///                 SELECT "asset_pairs"."id",
///                     "asset_pairs"."pair1",
///                     "asset_pairs"."pair2"
///                 FROM "asset_pairs"
///                 WHERE ("asset_pairs"."pair1", "asset_pairs"."pair2") IN ((5, 3))
///             ) AS "pairs" ON "pairs"."pair1" = "base_pairs"."pair1"
///     ) AS "filtered"
///     JOIN LATERAL (
///         SELECT "rate",
///             "recorded_at"
///         FROM "asset_history"
///         WHERE "pair_id" = "filtered"."id"
///         ORDER BY "recorded_at" DESC
///         LIMIT 1
///     ) AS "asset_history" ON TRUE
/// ```
#[tracing::instrument(skip_all)]
pub fn get_latest_asset_pair_rates(
    pairs: Vec<AssetPair>,
    date_floor: Option<OffsetDateTime>,
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
        .column((AssetHistoryIden::Table, AssetHistoryIden::RecordedAt))
        .from_subquery(filtered_query, AssetsAliasIden::FilteredPairsSubquery)
        .join_lateral(
            sea_query::JoinType::Join,
            Query::select()
                .columns([AssetHistoryIden::Rate, AssetHistoryIden::RecordedAt])
                .from(AssetHistoryIden::Table)
                .and_where(
                    Expr::col(AssetHistoryIden::PairId)
                        .equals((AssetsAliasIden::FilteredPairsSubquery, AssetPairsIden::Id)),
                )
                .conditions(
                    date_floor.is_none(),
                    // if condition is true then add the following condition
                    |q| {
                        q.limit(1)
                            .order_by(AssetHistoryIden::RecordedAt, sea_query::Order::Desc);
                    },
                    // otherwise leave it as is
                    |_q| {},
                )
                .conditions(
                    date_floor.is_some(), // if condition is true then add the following condition
                    |q| {
                        q.and_where(
                            Expr::col(AssetHistoryIden::RecordedAt)
                                .gte(Expr::val(date_floor.unwrap())),
                        )
                        .order_by(AssetHistoryIden::RecordedAt, sea_query::Order::Asc);
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

/// This query takes in array of `AssetPairDate`, which contains asset id 1, asset id 2 and date
/// For each pair it tries to get pair id from the database. If not found, it tries to get pair id
/// with the base id for the first asset.
/// For each passed element in array retruns a row with the latest price for that pair (or that base pair)
/// If price is not found, it returns null for the price and date.
/// If pair is not found, it returns null for all elements in the row.
///
/// Executes the following query
/// Returns response which can be mapped to `AssetPairRate`
/// ```sql
/// SELECT "pair_ids_dates_list"."pair1",
///     "pair_ids_dates_list"."pair2",
///     "asset_history"."rate",
///     "asset_history"."date"
/// FROM (
///         SELECT COALESCE("pairs"."pair1", "base_pairs"."pair1") AS "pair1",
///             COALESCE("pairs"."pair2", "base_pairs"."pair2") AS "pair2",
///             COALESCE("pairs"."id", "base_pairs"."id") AS "id",
///             "pairs_dates_list"."date"
///         FROM (
///                 SELECT unnest(ARRAY [5, ...]) AS "pair1",
///                     unnest(ARRAY [2, ...]) AS "pair2",
///                     unnest(ARRAY ['2003-01-01 12:00:00'::timestamp, ...]
///                     ) AS "date"
///             ) AS "pairs_dates_list"
///             LEFT JOIN (
///                 SELECT "asset_pairs"."id",
///                     "asset_pairs"."pair1",
///                     "asset_pairs"."pair2"
///                 FROM "asset_pairs"
///             ) AS "pairs" ON ("pairs"."pair1", "pairs"."pair2") = (
///                 "pairs_dates_list"."pair1",
///                 "pairs_dates_list"."pair2"
///             )
///             LEFT JOIN (
///                 SELECT "asset_pairs"."id",
///                     "asset_pairs"."pair1",
///                     "asset_pairs"."pair2"
///                 FROM "asset_pairs"
///                     JOIN "assets" ON "assets"."id" = "asset_pairs"."pair1"
///                 WHERE "asset_pairs"."pair2" = "assets"."base_pair_id"
///             ) AS "base_pairs" ON "base_pairs"."pair1" = "pairs_dates_list"."pair1"
///     ) AS "pair_ids_dates_list"
///     LEFT JOIN LATERAL (
///         SELECT "rate",
///             "date"
///         FROM "asset_history"
///         WHERE "pair_id" = "pair_ids_dates_list"."id"
///             AND "date" <= "pair_ids_dates_list"."date"
///         ORDER BY "date" DESC
///         LIMIT 1
///     ) AS "asset_history" ON TRUE
/// ```
#[tracing::instrument(skip_all)]
pub fn get_pair_prices_by_dates(pair_dates: Vec<AssetPairDate>) -> DbQueryWithValues {
    let assets_1_array = Value::Array(
        sea_query::ArrayType::Int,
        Some(Box::new(
            pair_dates.iter().map(|x| x.pair1.into()).collect(),
        )),
    );
    let assets_2_array = Value::Array(
        sea_query::ArrayType::Int,
        Some(Box::new(
            pair_dates.iter().map(|x| x.pair2.into()).collect(),
        )),
    );
    let target_date_array = Value::Array(
        sea_query::ArrayType::TimeDateTimeWithTimeZone,
        Some(Box::new(pair_dates.iter().map(|x| x.date.into()).collect())),
    );

    let asset_pairs_dates = Query::select()
        .expr_as(
            Func::cust(Unnest).arg(assets_1_array),
            AssetPairsIden::Pair1,
        )
        .expr_as(
            Func::cust(Unnest).arg(assets_2_array),
            AssetPairsIden::Pair2,
        )
        .expr_as(
            Func::cust(Unnest).arg(target_date_array),
            AssetHistoryIden::RecordedAt,
        )
        .to_owned();

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
        .to_owned();

    let paior_ids_dates_query = Query::select()
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
        .column((
            AssetsAliasIden::PairsDatesList,
            AssetHistoryIden::RecordedAt,
        ))
        .from_subquery(asset_pairs_dates, AssetsAliasIden::PairsDatesList)
        .join_subquery(
            sea_query::JoinType::LeftJoin,
            pairs_query,
            AssetsAliasIden::PairsSubquery,
            Expr::tuple([
                Expr::col((AssetsAliasIden::PairsSubquery, AssetPairsIden::Pair1)).into(),
                Expr::col((AssetsAliasIden::PairsSubquery, AssetPairsIden::Pair2)).into(),
            ])
            .eq(Expr::tuple([
                Expr::col((AssetsAliasIden::PairsDatesList, AssetPairsIden::Pair1)).into(),
                Expr::col((AssetsAliasIden::PairsDatesList, AssetPairsIden::Pair2)).into(),
            ])),
        )
        .join_subquery(
            sea_query::JoinType::LeftJoin,
            base_pairs_query,
            AssetsAliasIden::BasePairsSubquery,
            Expr::col((AssetsAliasIden::BasePairsSubquery, AssetPairsIden::Pair1))
                .equals((AssetsAliasIden::PairsDatesList, AssetPairsIden::Pair1)),
        )
        .to_owned();

    let history_query = Query::select()
        .columns([AssetHistoryIden::Rate, AssetHistoryIden::RecordedAt])
        .from(AssetHistoryIden::Table)
        .and_where(
            Expr::col(AssetHistoryIden::PairId)
                .equals((AssetsAliasIden::PairIdsDatesList, AssetPairsIden::Id)),
        )
        .and_where(Expr::col(AssetHistoryIden::RecordedAt).lte(Expr::col((
            AssetsAliasIden::PairIdsDatesList,
            AssetHistoryIden::RecordedAt,
        ))))
        .order_by(AssetHistoryIden::RecordedAt, Order::Desc)
        .limit(1)
        .to_owned();

    Query::select()
        .column((AssetsAliasIden::PairIdsDatesList, AssetPairsIden::Pair1))
        .column((AssetsAliasIden::PairIdsDatesList, AssetPairsIden::Pair2))
        .column((AssetHistoryIden::Table, AssetHistoryIden::Rate))
        .column((AssetHistoryIden::Table, AssetHistoryIden::RecordedAt))
        .from_subquery(paior_ids_dates_query, AssetsAliasIden::PairIdsDatesList)
        .join_lateral(
            sea_query::JoinType::LeftJoin,
            history_query,
            AssetHistoryIden::Table,
            Expr::cust("TRUE"),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

/// This query takes a list of asset ids and dates and a reference asset and interval
/// It then queries the database to get asset rates from the date for that asset in intervals.
/// If it doesn't find direct pair, it also queries base rate conversion
///
/// Executes the following query
/// Returns response which can be mapped to `AssetPairRate`
/// ```sql
/// WITH "input" AS (
///     SELECT unnest($1) AS "pair1",
///         unnest($2) AS "date"
/// ),
/// "base_pairs" AS (
///     SELECT "asset_pairs"."id",
///         "asset_pairs"."pair1",
///         "asset_pairs"."pair2"
///     FROM "asset_pairs"
///         JOIN "assets" ON "assets"."id" = "asset_pairs"."pair1"
///         JOIN "input" ON "input"."pair1" = "asset_pairs"."pair1"
///     WHERE "asset_pairs"."pair2" = "assets"."base_pair_id"
/// ),
/// "direct_pairs" AS (
///     SELECT "asset_pairs"."id",
///         "asset_pairs"."pair1",
///         "asset_pairs"."pair2"
///     FROM "asset_pairs"
///         JOIN "input" ON "input"."pair1" = "asset_pairs"."pair1"
///     WHERE "asset_pairs"."pair2" = $3
/// ),
/// "combined_pairs" AS (
///     SELECT "input"."date" AS "date",
///         COALESCE("direct_pairs"."pair1", "base_pairs"."pair1") AS "pair1",
///         COALESCE("direct_pairs"."pair2", "base_pairs"."pair2") AS "pair2",
///         COALESCE("direct_pairs"."id", "base_pairs"."id") AS "id"
///     FROM "base_pairs"
///         FULL OUTER JOIN "direct_pairs" ON "direct_pairs"."pair1" = "base_pairs"."pair1"
///         JOIN "input" ON "input"."pair1" = "base_pairs"."pair1"
/// ),
/// "secondary_pairs" AS (
///     SELECT MIN("combined_pairs"."date") AS "date",
///         "asset_pairs"."id",
///         "asset_pairs"."pair1",
///         "asset_pairs"."pair2"
///     FROM "asset_pairs"
///         JOIN "combined_pairs" ON "combined_pairs"."pair2" = "asset_pairs"."pair1"
///     WHERE "asset_pairs"."pair2" = $4
///     GROUP BY "asset_pairs"."id",
///         "asset_pairs"."pair1",
///         "asset_pairs"."pair2"
/// ),
/// "all_filtered_pairs" AS (
///     SELECT "combined_pairs"."date",
///         "combined_pairs"."pair1",
///         "combined_pairs"."pair2",
///         "combined_pairs"."id"
///     FROM "combined_pairs"
///     UNION ALL
///     (
///         SELECT "secondary_pairs"."date",
///             "secondary_pairs"."pair1",
///             "secondary_pairs"."pair2",
///             "secondary_pairs"."id"
///         FROM "secondary_pairs"
///     )
/// )
/// SELECT "all_filtered_pairs"."pair1",
///     "all_filtered_pairs"."pair2",
///     AVG("asset_history"."rate") AS "avg_rate",
///     date_bin(
///         interval '172800 seconds',
///         "asset_history"."recorded_at",
///         'epoch'
///     ) AS "binned_date"
/// FROM "all_filtered_pairs"
///     JOIN LATERAL (
///         SELECT "rate",
///             "recorded_at"
///         FROM (
///                 SELECT "rate",
///                     "recorded_at"
///                 FROM "asset_history"
///                 WHERE "pair_id" = "all_filtered_pairs"."id"
///                     AND "recorded_at" > "all_filtered_pairs"."date"
///                 UNION ALL
///                 (
///                     SELECT "rate",
///                         "recorded_at"
///                     FROM "asset_history"
///                     WHERE "pair_id" = "all_filtered_pairs"."id"
///                         AND "recorded_at" <= "all_filtered_pairs"."date"
///                     ORDER BY "recorded_at" DESC
///                     LIMIT $5
///                 )
///             ) AS "asset_history"
///         ORDER BY "recorded_at" ASC
///     ) AS "asset_history" ON TRUE
/// GROUP BY "all_filtered_pairs"."pair1",
///     "all_filtered_pairs"."pair2",
///     "binned_date"
/// ORDER BY "binned_date" ASC
/// ```
#[tracing::instrument(skip_all)]
pub fn get_asset_pairs_rates_with_conversions(
    reference_asset: i32,
    asset_dates: HashMap<i32, OffsetDateTime>,
    interval: Duration,
) -> DbQueryWithValues {
    let mut ids_vec = Vec::new();
    let mut dates_vec = Vec::new();
    asset_dates.into_iter().for_each(|(k, v)| {
        ids_vec.push(k.into());
        dates_vec.push(v.into());
    });

    let ids_array = Value::Array(sea_query::ArrayType::Int, Some(Box::new(ids_vec)));

    let timestamp_array = Value::Array(
        sea_query::ArrayType::TimeDateTimeWithTimeZone,
        Some(Box::new(dates_vec)),
    );

    let input_cte = CommonTableExpression::new()
        .query(
            Query::select()
                .expr_as(Func::cust(Unnest).arg(ids_array), AssetPairsIden::Pair1)
                .expr_as(
                    Func::cust(Unnest).arg(timestamp_array),
                    AssetHistoryCalculationIden::Date,
                )
                .to_owned(),
        )
        .table_name(AssetsAliasIden::InputSubquery)
        .to_owned();

    let base_asset_pairs_cte = CommonTableExpression::new()
        .query(
            Query::select()
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
                .join(
                    sea_query::JoinType::Join,
                    AssetsAliasIden::InputSubquery,
                    Expr::col((AssetsAliasIden::InputSubquery, AssetPairsIden::Pair1))
                        .equals((AssetPairsIden::Table, AssetPairsIden::Pair1)),
                )
                .and_where(
                    Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair2))
                        .equals((AssetsIden::Table, AssetsIden::BasePairId)),
                )
                .to_owned(),
        )
        .table_name(AssetsAliasIden::BasePairsSubquery)
        .to_owned();

    let direct_pairs_cte = CommonTableExpression::new()
        .query(
            Query::select()
                .column((AssetPairsIden::Table, AssetPairsIden::Id))
                .column((AssetPairsIden::Table, AssetPairsIden::Pair1))
                .column((AssetPairsIden::Table, AssetPairsIden::Pair2))
                .from(AssetPairsIden::Table)
                .join(
                    sea_query::JoinType::Join,
                    AssetsAliasIden::InputSubquery,
                    Expr::col((AssetsAliasIden::InputSubquery, AssetPairsIden::Pair1))
                        .equals((AssetPairsIden::Table, AssetPairsIden::Pair1)),
                )
                .and_where(
                    Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair2)).eq(reference_asset),
                )
                .to_owned(),
        )
        .table_name(AssetsAliasIden::DirectPairsSubquery)
        .to_owned();

    let combined_pairs_cte = CommonTableExpression::new()
        .query(
            Query::select()
                .expr_as(
                    Expr::col((
                        AssetsAliasIden::InputSubquery,
                        AssetHistoryCalculationIden::Date,
                    )),
                    AssetHistoryCalculationIden::Date,
                )
                .expr_as(
                    Func::coalesce([
                        Expr::col((AssetsAliasIden::DirectPairsSubquery, AssetPairsIden::Pair1))
                            .into(),
                        Expr::col((AssetsAliasIden::BasePairsSubquery, AssetPairsIden::Pair1))
                            .into(),
                    ]),
                    AssetPairsIden::Pair1,
                )
                .expr_as(
                    Func::coalesce([
                        Expr::col((AssetsAliasIden::DirectPairsSubquery, AssetPairsIden::Pair2))
                            .into(),
                        Expr::col((AssetsAliasIden::BasePairsSubquery, AssetPairsIden::Pair2))
                            .into(),
                    ]),
                    AssetPairsIden::Pair2,
                )
                .expr_as(
                    Func::coalesce([
                        Expr::col((AssetsAliasIden::DirectPairsSubquery, AssetPairsIden::Id))
                            .into(),
                        Expr::col((AssetsAliasIden::BasePairsSubquery, AssetPairsIden::Id)).into(),
                    ]),
                    AssetPairsIden::Id,
                )
                .from(AssetsAliasIden::BasePairsSubquery)
                .join(
                    sea_query::JoinType::FullOuterJoin,
                    AssetsAliasIden::DirectPairsSubquery,
                    Expr::col((AssetsAliasIden::DirectPairsSubquery, AssetPairsIden::Pair1))
                        .equals((AssetsAliasIden::BasePairsSubquery, AssetPairsIden::Pair1)),
                )
                .join(
                    sea_query::JoinType::Join,
                    AssetsAliasIden::InputSubquery,
                    Expr::col((AssetsAliasIden::InputSubquery, AssetPairsIden::Pair1))
                        .equals((AssetsAliasIden::BasePairsSubquery, AssetPairsIden::Pair1))
                        .or(
                            Expr::col((AssetsAliasIden::InputSubquery, AssetPairsIden::Pair1))
                                .equals((
                                    AssetsAliasIden::DirectPairsSubquery,
                                    AssetPairsIden::Pair1,
                                )),
                        ),
                )
                .to_owned(),
        )
        .table_name(AssetsAliasIden::CombinedPairsSubquery)
        .to_owned();

    let secondary_pairs_cte = CommonTableExpression::new()
        .query(
            Query::select()
                .expr_as(
                    Func::min(Expr::col((
                        AssetsAliasIden::CombinedPairsSubquery,
                        AssetHistoryCalculationIden::Date,
                    ))),
                    AssetHistoryCalculationIden::Date,
                )
                .column((AssetPairsIden::Table, AssetPairsIden::Id))
                .column((AssetPairsIden::Table, AssetPairsIden::Pair1))
                .column((AssetPairsIden::Table, AssetPairsIden::Pair2))
                .from(AssetPairsIden::Table)
                .join(
                    sea_query::JoinType::Join,
                    AssetsAliasIden::CombinedPairsSubquery,
                    Expr::col((
                        AssetsAliasIden::CombinedPairsSubquery,
                        AssetPairsIden::Pair2,
                    ))
                    .equals((AssetPairsIden::Table, AssetPairsIden::Pair1)),
                )
                .and_where(
                    Expr::col((AssetPairsIden::Table, AssetPairsIden::Pair2)).eq(reference_asset),
                )
                .group_by_columns([
                    (AssetPairsIden::Table, AssetPairsIden::Id),
                    (AssetPairsIden::Table, AssetPairsIden::Pair1),
                    (AssetPairsIden::Table, AssetPairsIden::Pair2),
                ])
                .to_owned(),
        )
        .table_name(AssetsAliasIden::SecondaryPairsSubquery)
        .to_owned();

    let all_filtered_pairs_cte = CommonTableExpression::new()
        .query(
            Query::select()
                .column((
                    AssetsAliasIden::CombinedPairsSubquery,
                    AssetHistoryCalculationIden::Date,
                ))
                .column((
                    AssetsAliasIden::CombinedPairsSubquery,
                    AssetPairsIden::Pair1,
                ))
                .column((
                    AssetsAliasIden::CombinedPairsSubquery,
                    AssetPairsIden::Pair2,
                ))
                .column((AssetsAliasIden::CombinedPairsSubquery, AssetPairsIden::Id))
                .from(AssetsAliasIden::CombinedPairsSubquery)
                .union(
                    sea_query::UnionType::All,
                    Query::select()
                        .column((
                            AssetsAliasIden::SecondaryPairsSubquery,
                            AssetHistoryCalculationIden::Date,
                        ))
                        .column((
                            AssetsAliasIden::SecondaryPairsSubquery,
                            AssetPairsIden::Pair1,
                        ))
                        .column((
                            AssetsAliasIden::SecondaryPairsSubquery,
                            AssetPairsIden::Pair2,
                        ))
                        .column((AssetsAliasIden::SecondaryPairsSubquery, AssetPairsIden::Id))
                        .from(AssetsAliasIden::SecondaryPairsSubquery)
                        .to_owned(),
                )
                .to_owned(),
        )
        .table_name(AssetsAliasIden::AllFilteredPairsSubquery)
        .to_owned();

    let lateral_history_subquery = Query::select()
        .columns([AssetHistoryIden::Rate, AssetHistoryIden::RecordedAt])
        .from_subquery(
            Query::select()
                .columns([AssetHistoryIden::Rate, AssetHistoryIden::RecordedAt])
                .from(AssetHistoryIden::Table)
                .and_where(
                    Expr::col(AssetHistoryIden::PairId)
                        .equals((
                            AssetsAliasIden::AllFilteredPairsSubquery,
                            AssetPairsIden::Id,
                        ))
                        .and(Expr::col(AssetHistoryIden::RecordedAt).gt(Expr::col((
                            AssetsAliasIden::AllFilteredPairsSubquery,
                            AssetHistoryCalculationIden::Date,
                        )))),
                )
                .union(
                    sea_query::UnionType::All,
                    Query::select()
                        .columns([AssetHistoryIden::Rate, AssetHistoryIden::RecordedAt])
                        .from(AssetHistoryIden::Table)
                        .and_where(
                            Expr::col(AssetHistoryIden::PairId)
                                .equals((
                                    AssetsAliasIden::AllFilteredPairsSubquery,
                                    AssetPairsIden::Id,
                                ))
                                .and(Expr::col(AssetHistoryIden::RecordedAt).lte(Expr::col((
                                    AssetsAliasIden::AllFilteredPairsSubquery,
                                    AssetHistoryCalculationIden::Date,
                                )))),
                        )
                        .order_by(AssetHistoryIden::RecordedAt, Order::Desc)
                        .limit(1)
                        .to_owned(),
                )
                .to_owned(),
            AssetHistoryIden::Table,
        )
        .order_by(AssetHistoryIden::RecordedAt, Order::Asc)
        .to_owned();

    let main_query = Query::select()
        .column((
            AssetsAliasIden::AllFilteredPairsSubquery,
            AssetPairsIden::Pair1,
        ))
        .column((
            AssetsAliasIden::AllFilteredPairsSubquery,
            AssetPairsIden::Pair2,
        ))
        .expr_as(
            Func::avg(Expr::col((AssetHistoryIden::Table, AssetHistoryIden::Rate))),
            AssetHistoryCalculationIden::AvgRate,
        )
        .expr_as(
            CustomFunc::date_bin_col(
                interval,
                (AssetHistoryIden::Table, AssetHistoryIden::RecordedAt),
            ),
            AssetHistoryCalculationIden::BinnedDate,
        )
        .from(AssetsAliasIden::AllFilteredPairsSubquery)
        .join_lateral(
            sea_query::JoinType::Join,
            lateral_history_subquery,
            AssetHistoryIden::Table,
            Expr::cust("TRUE"),
        )
        .group_by_columns([
            (
                AssetsAliasIden::AllFilteredPairsSubquery,
                AssetPairsIden::Pair1,
            ),
            (
                AssetsAliasIden::AllFilteredPairsSubquery,
                AssetPairsIden::Pair2,
            ),
        ])
        .group_by_col(AssetHistoryCalculationIden::BinnedDate)
        .order_by(AssetHistoryCalculationIden::BinnedDate, Order::Asc)
        .to_owned();

    main_query
        .with(
            WithClause::new()
                .cte(input_cte)
                .cte(base_asset_pairs_cte)
                .cte(direct_pairs_cte)
                .cte(combined_pairs_cte)
                .cte(secondary_pairs_cte)
                .cte(all_filtered_pairs_cte)
                .to_owned(),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
