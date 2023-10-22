use sea_query::{Alias, Expr, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::types::Uuid;

use crate::{
    idens::{
        portfolio_idens::PortfolioAccountIden,
        transaction_idens::{
            TransactionCategoriesIden, TransactionDescriptionsIden, TransactionGroupIden,
            TransactionIden,
        },
    },
    models::transaction_models::{
        AddTransactionDescriptionModel, AddUpdateTransactionGroupModel, AddUpdateTransactionModel,
    },
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn get_transactions_financials(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .columns([
            TransactionIden::AssetId,
            TransactionIden::AccountId,
            TransactionIden::Quantity,
            TransactionIden::Date,
        ])
        .from(TransactionIden::Table)
        .and_where(Expr::col(TransactionIden::UserId).eq(user_id))
        .order_by(TransactionIden::Date, sea_query::Order::Asc)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_transactions_with_groups(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column((TransactionIden::Table, TransactionIden::Id))
        .column((TransactionIden::Table, TransactionIden::UserId))
        .column((TransactionIden::Table, TransactionIden::GroupId))
        .column((TransactionIden::Table, TransactionIden::AssetId))
        .column((TransactionIden::Table, TransactionIden::AccountId))
        .column((TransactionIden::Table, TransactionIden::CategoryId))
        .column((TransactionIden::Table, TransactionIden::Quantity))
        .column((TransactionIden::Table, TransactionIden::Date))
        .column((TransactionIden::Table, TransactionIden::LinkId))
        .column((
            TransactionDescriptionsIden::Table,
            TransactionDescriptionsIden::Description,
        ))
        .expr_as(
            Expr::col((
                TransactionGroupIden::Table,
                TransactionGroupIden::Description,
            )),
            Alias::new("group_description"),
        )
        .expr_as(
            Expr::col((
                TransactionGroupIden::Table,
                TransactionGroupIden::CategoryId,
            )),
            Alias::new("group_category_id"),
        )
        .expr_as(
            Expr::col((PortfolioAccountIden::Table, PortfolioAccountIden::Name)),
            Alias::new("account_name"),
        )
        .column((TransactionGroupIden::Table, TransactionGroupIden::DateAdded))
        .from(TransactionIden::Table)
        .left_join(
            TransactionDescriptionsIden::Table,
            Expr::col((TransactionIden::Table, TransactionIden::Id)).equals((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::TransactionId,
            )),
        )
        .left_join(
            TransactionGroupIden::Table,
            Expr::col((TransactionIden::Table, TransactionIden::GroupId)).equals((
                TransactionGroupIden::Table,
                TransactionGroupIden::TransactionGroupId,
            )),
        )
        .left_join(
            PortfolioAccountIden::Table,
            Expr::col((TransactionIden::Table, TransactionIden::AccountId))
                .equals((PortfolioAccountIden::Table, PortfolioAccountIden::Id)),
        )
        .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_transaction_group(transaction_group_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column((TransactionIden::Table, TransactionIden::Id))
        .column((TransactionIden::Table, TransactionIden::UserId))
        .column((TransactionIden::Table, TransactionIden::GroupId))
        .column((TransactionIden::Table, TransactionIden::AssetId))
        .column((TransactionIden::Table, TransactionIden::AccountId))
        .column((TransactionIden::Table, TransactionIden::CategoryId))
        .column((TransactionIden::Table, TransactionIden::Quantity))
        .column((TransactionIden::Table, TransactionIden::Date))
        .column((TransactionIden::Table, TransactionIden::LinkId))
        .column((
            TransactionDescriptionsIden::Table,
            TransactionDescriptionsIden::Description,
        ))
        .expr_as(
            Expr::col((
                TransactionGroupIden::Table,
                TransactionGroupIden::Description,
            )),
            Alias::new("group_description"),
        )
        .expr_as(
            Expr::col((
                TransactionGroupIden::Table,
                TransactionGroupIden::CategoryId,
            )),
            Alias::new("group_category_id"),
        )
        .expr_as(
            Expr::col((PortfolioAccountIden::Table, PortfolioAccountIden::Name)),
            Alias::new("account_name"),
        )
        .column((TransactionGroupIden::Table, TransactionGroupIden::DateAdded))
        .from(TransactionIden::Table)
        .left_join(
            TransactionDescriptionsIden::Table,
            Expr::col((TransactionIden::Table, TransactionIden::Id)).equals((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::TransactionId,
            )),
        )
        .left_join(
            TransactionGroupIden::Table,
            Expr::col((TransactionIden::Table, TransactionIden::GroupId)).equals((
                TransactionGroupIden::Table,
                TransactionGroupIden::TransactionGroupId,
            )),
        )
        .left_join(
            PortfolioAccountIden::Table,
            Expr::col((TransactionIden::Table, TransactionIden::AccountId))
                .equals((PortfolioAccountIden::Table, PortfolioAccountIden::Id)),
        )
        .and_where(
            Expr::col((TransactionIden::Table, TransactionIden::GroupId)).eq(transaction_group_id),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn insert_descriptions(models: Vec<AddTransactionDescriptionModel>) -> DbQueryWithValues {
    let mut description_builder = Query::insert()
        .into_table(TransactionDescriptionsIden::Table)
        .columns([
            TransactionDescriptionsIden::TransactionId,
            TransactionDescriptionsIden::Description,
        ])
        .to_owned();

    for model in models.into_iter() {
        description_builder
            .values_panic(vec![model.transaction_id.into(), model.description.into()]);
    }

    description_builder.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn insert_transaction_group(group: AddUpdateTransactionGroupModel) -> DbQueryWithValues {
    Query::insert()
        .into_table(TransactionGroupIden::Table)
        .columns([
            TransactionGroupIden::TransactionGroupId,
            TransactionGroupIden::CategoryId,
            TransactionGroupIden::Description,
            TransactionGroupIden::DateAdded,
        ])
        .values_panic(vec![
            group.group_id.into(),
            group.category_id.into(),
            group.description.into(),
            group.date.into(),
        ])
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn insert_transactions(models: Vec<AddUpdateTransactionModel>) -> DbQueryWithValues {
    let mut builder2 = Query::insert()
        .into_table(TransactionIden::Table)
        .columns([
            TransactionIden::UserId,
            TransactionIden::GroupId,
            TransactionIden::AssetId,
            TransactionIden::AccountId,
            TransactionIden::CategoryId,
            TransactionIden::Quantity,
            TransactionIden::Date,
            TransactionIden::LinkId,
        ])
        .returning_col(TransactionIden::Id)
        .to_owned();
    for model in models.into_iter() {
        // where items is a vec of row's values
        builder2.values_panic(vec![
            model.user_id.into(),
            model.group_id.into(),
            model.asset_id.into(),
            model.account_id.into(),
            model.category_id.into(),
            model.quantity.into(),
            model.date.into(),
            model.link_id.into(),
        ]);
    }
    builder2.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn get_categories() -> DbQueryWithValues {
    Query::select()
        .column(TransactionCategoriesIden::Id)
        .column(TransactionCategoriesIden::Category)
        .column(TransactionCategoriesIden::Icon)
        .from(TransactionCategoriesIden::Table)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_transactions(transaction_ids: Vec<i32>) -> DbQueryWithValues {
    Query::delete()
        .from_table(TransactionIden::Table)
        .and_where(Expr::col(TransactionIden::Id).is_in(transaction_ids))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_descriptions(transaction_ids: Vec<i32>) -> DbQueryWithValues {
    Query::delete()
        .from_table(TransactionDescriptionsIden::Table)
        .and_where(Expr::col(TransactionDescriptionsIden::TransactionId).is_in(transaction_ids))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_group(new_model: AddUpdateTransactionGroupModel) -> DbQueryWithValues {
    Query::update()
        .table(TransactionGroupIden::Table)
        .value(TransactionGroupIden::CategoryId, new_model.category_id)
        .value(TransactionGroupIden::Description, new_model.description)
        .value(TransactionGroupIden::DateAdded, new_model.date)
        .and_where(Expr::col(TransactionGroupIden::TransactionGroupId).eq(new_model.group_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_description(id: i32, description: String) -> DbQueryWithValues {
    Query::update()
        .table(TransactionDescriptionsIden::Table)
        .value(TransactionDescriptionsIden::Description, description)
        .and_where(Expr::col(TransactionDescriptionsIden::TransactionId).eq(id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_transaction(id: i32, model: AddUpdateTransactionModel) -> DbQueryWithValues {
    Query::update()
        .table(TransactionIden::Table)
        .value(TransactionIden::AccountId, model.account_id)
        .value(TransactionIden::AssetId, model.asset_id)
        .value(TransactionIden::CategoryId, model.category_id)
        .value(TransactionIden::Quantity, model.quantity)
        .value(TransactionIden::Date, model.date)
        .value(TransactionIden::LinkId, model.link_id)
        .and_where(Expr::col(TransactionIden::Id).eq(id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_transaction_group(id: Uuid) -> DbQueryWithValues {
    Query::delete()
        .from_table(TransactionGroupIden::Table)
        .and_where(Expr::col(TransactionGroupIden::TransactionGroupId).eq(id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
