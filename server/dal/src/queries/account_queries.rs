use sea_query::{Expr, ExprTrait, Func, JoinType, Order, PostgresQueryBuilder, Query};
use sea_query_sqlx::SqlxBinder;
use sqlx::types::Uuid;

use super::DbQueryWithValues;
use crate::{
    idens::{
        account_idens::{
            AccountIden, AccountLiquidityTypesIden, AccountTypesIden, AccountsAliasIden,
            SuggestedCurrencyIden,
        },
        asset_idens::AssetsIden,
        entries_idens::EntryIden,
    },
    models::{
        account_models::{AccountCreationModel, AccountUpdateModel},
        asset_models::asset_type_ids,
    },
    query_params::get_accounts_params::{GetAccountsParams, GetAccountsParamsSeachType},
};

#[macros::named_query]
pub fn get_accounts(params: GetAccountsParams) -> DbQueryWithValues {
    let mut get_accounts_builder = Query::select()
        .column((AccountIden::Table, AccountIden::Id))
        .column((AccountIden::Table, AccountIden::UserId))
        .column((AccountIden::Table, AccountIden::AccountName))
        .column((AccountIden::Table, AccountIden::AccountType))
        .column((AccountIden::Table, AccountIden::OwnershipShare))
        .conditions(
            params.include_metadata,
            |q| {
                q.column((AccountTypesIden::Table, AccountTypesIden::AccountTypeName))
                    .column((AccountIden::Table, AccountIden::LiquidityType))
                    .column((
                        AccountLiquidityTypesIden::Table,
                        AccountLiquidityTypesIden::LiquidityTypeName,
                    ))
                    .join(
                        sea_query::JoinType::InnerJoin,
                        AccountLiquidityTypesIden::Table,
                        Expr::col((
                            AccountLiquidityTypesIden::Table,
                            AccountLiquidityTypesIden::Id,
                        ))
                        .equals((AccountIden::Table, AccountIden::LiquidityType)),
                    )
                    .join(
                        sea_query::JoinType::InnerJoin,
                        AccountTypesIden::Table,
                        Expr::col((AccountTypesIden::Table, AccountTypesIden::Id))
                            .equals((AccountIden::Table, AccountIden::AccountType)),
                    );
            },
            |_q| {},
        )
        .conditions(
            params.include_suggested_currency,
            |q| {
                q.column((
                    AccountsAliasIden::SuggestedCurrencySubquery,
                    SuggestedCurrencyIden::Id,
                ))
                .column((
                    AccountsAliasIden::SuggestedCurrencySubquery,
                    SuggestedCurrencyIden::Ticker,
                ))
                .column((
                    AccountsAliasIden::SuggestedCurrencySubquery,
                    SuggestedCurrencyIden::Name,
                ))
                .column((
                    AccountsAliasIden::SuggestedCurrencySubquery,
                    SuggestedCurrencyIden::AssetType,
                ))
                .join_lateral(
                    JoinType::LeftJoin,
                    suggested_currency_subquery(),
                    AccountsAliasIden::SuggestedCurrencySubquery,
                    Expr::cust("TRUE"),
                );
            },
            |_q| {},
        )
        .conditions(
            params.include_inactive,
            |_q| {},
            |q| {
                q.and_where(Expr::col((AccountIden::Table, AccountIden::Active)).eq(true));
            },
        )
        .from(AccountIden::Table)
        .to_owned();

    match params.search_type {
        GetAccountsParamsSeachType::ByIds(ids) => {
            get_accounts_builder
                .and_where(Expr::col((AccountIden::Table, AccountIden::Id)).is_in(ids));
        }
        GetAccountsParamsSeachType::ById(id) => {
            get_accounts_builder.and_where(Expr::col((AccountIden::Table, AccountIden::Id)).eq(id));
        }
        GetAccountsParamsSeachType::ByUserId(id) => {
            get_accounts_builder
                .and_where(Expr::col((AccountIden::Table, AccountIden::UserId)).eq(id));
        }
    };

    if let Some(user_id) = params.user_id {
        get_accounts_builder
            .and_where(Expr::col((AccountIden::Table, AccountIden::UserId)).eq(user_id));
    }

    get_accounts_builder.build_sqlx(PostgresQueryBuilder).into()
}

fn suggested_currency_subquery() -> sea_query::SelectStatement {
    Query::select()
        .expr_as(
            Expr::col((EntryIden::Table, EntryIden::AssetId)),
            SuggestedCurrencyIden::Id,
        )
        .expr_as(
            Expr::col((AssetsIden::Table, AssetsIden::Ticker)),
            SuggestedCurrencyIden::Ticker,
        )
        .expr_as(
            Expr::col((AssetsIden::Table, AssetsIden::AssetName)),
            SuggestedCurrencyIden::Name,
        )
        .expr_as(
            Expr::col((AssetsIden::Table, AssetsIden::AssetType)),
            SuggestedCurrencyIden::AssetType,
        )
        .from(EntryIden::Table)
        .join(
            JoinType::Join,
            AssetsIden::Table,
            Expr::col((AssetsIden::Table, AssetsIden::Id))
                .equals((EntryIden::Table, EntryIden::AssetId))
                .and(
                    Expr::col((AssetsIden::Table, AssetsIden::AssetType))
                        .eq(asset_type_ids::CURRENCY),
                ),
        )
        .and_where(
            Expr::col((EntryIden::Table, EntryIden::AccountId))
                .equals((AccountIden::Table, AccountIden::Id)),
        )
        .group_by_col((EntryIden::Table, EntryIden::AssetId))
        .group_by_col((AssetsIden::Table, AssetsIden::Ticker))
        .group_by_col((AssetsIden::Table, AssetsIden::AssetName))
        .group_by_col((AssetsIden::Table, AssetsIden::AssetType))
        .order_by_expr(
            Func::count(Expr::col((EntryIden::Table, EntryIden::AssetId))).into(),
            Order::Desc,
        )
        .order_by((EntryIden::Table, EntryIden::AssetId), Order::Asc)
        .limit(1)
        .take()
}

#[macros::named_query]
pub fn update_account(model: AccountUpdateModel) -> DbQueryWithValues {
    Query::update()
        .table(AccountIden::Table)
        .value(AccountIden::AccountName, model.account_name)
        .value(AccountIden::AccountType, model.account_type)
        .value(AccountIden::LiquidityType, model.liquidity_type)
        .value(AccountIden::OwnershipShare, model.ownership_share)
        .and_where(Expr::col(AccountIden::Id).eq(model.account_id))
        .and_where(Expr::col(AccountIden::UserId).eq(model.user_id))
        .and_where(Expr::col(AccountIden::Active).eq(true))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn insert_account(model: AccountCreationModel) -> DbQueryWithValues {
    Query::insert()
        .into_table(AccountIden::Table)
        .columns(vec![
            AccountIden::UserId,
            AccountIden::AccountName,
            AccountIden::AccountType,
            AccountIden::LiquidityType,
            AccountIden::Active,
            AccountIden::OwnershipShare,
        ])
        .values_panic([
            model.user_id.into(),
            model.account_name.into(),
            model.account_type.into(),
            model.liquidity_type.into(),
            true.into(),
            model.ownership_share.into(),
        ])
        .returning_col(AccountIden::Id)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn deactivate_account(user_id: Uuid, account_id: Uuid) -> DbQueryWithValues {
    Query::update()
        .table(AccountIden::Table)
        .value(AccountIden::Active, false)
        .and_where(Expr::col(AccountIden::Id).eq(account_id))
        .and_where(Expr::col(AccountIden::UserId).eq(user_id))
        .and_where(Expr::col(AccountIden::Active).eq(true))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn get_account_types() -> DbQueryWithValues {
    Query::select()
        .columns(vec![
            AccountTypesIden::Id,
            AccountTypesIden::AccountTypeName,
        ])
        .from(AccountTypesIden::Table)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn get_account_liquidity_types() -> DbQueryWithValues {
    Query::select()
        .columns(vec![
            AccountLiquidityTypesIden::Id,
            AccountLiquidityTypesIden::LiquidityTypeName,
        ])
        .from(AccountLiquidityTypesIden::Table)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
