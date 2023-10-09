use sea_query::{Alias, Expr, OnConflict, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::types::Uuid;

use super::DbQueryWithValues;
use crate::{
    idens::{
        asset_idens::{AssetTypesIden, AssetsIden},
        portfolio_idens::{PortfolioAccountIden, PortfolioIden},
        CommonsIden,
    },
    models::portfolio_models::{PortfolioAccountModel, PortfolioUpdateModel},
};

#[tracing::instrument(skip_all)]
pub fn get_portfolio_with_asset_account_info(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
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
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_portfolio(models: Vec<PortfolioUpdateModel>) -> DbQueryWithValues {
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

    builder.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn insert_or_update_portfolio_account(models: PortfolioAccountModel) -> DbQueryWithValues {
    Query::insert()
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
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_portfolio_accounts_by_ids(uuids: Vec<Uuid>) -> DbQueryWithValues {
    Query::select()
        .column((PortfolioAccountIden::Table, PortfolioAccountIden::Id))
        .column((PortfolioAccountIden::Table, PortfolioAccountIden::Name))
        .from(PortfolioAccountIden::Table)
        .and_where(Expr::col(PortfolioAccountIden::Id).is_in(uuids))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_portfolio_accounts_by_user_id(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column((PortfolioAccountIden::Table, PortfolioAccountIden::Id))
        .column((PortfolioAccountIden::Table, PortfolioAccountIden::Name))
        .from(PortfolioAccountIden::Table)
        .and_where(Expr::col(PortfolioAccountIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
