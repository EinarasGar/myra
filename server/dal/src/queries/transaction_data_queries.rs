use sea_query::{Expr, ExprTrait, PostgresQueryBuilder, Query};
use sea_query_sqlx::SqlxBinder;
use sqlx::types::Uuid;

use crate::{
    idens::{
        entries_idens::EntryIden,
        transaction_idens::{
            TransactionDescriptionsIden, TransactionDividendsIden, TransactionIden,
        },
    },
    models::transaction_models::{
        AddTransactionDescriptionModel, AddTransactionDividendModel, AddTransactionModel,
        UpdateEntryModel, UpdateTransactionFieldsModel,
    },
};

use super::DbQueryWithValues;

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
pub fn get_transactions_description(transaction_ids: Vec<Uuid>) -> DbQueryWithValues {
    Query::select()
        .columns([
            TransactionDescriptionsIden::TransactionId,
            TransactionDescriptionsIden::Description,
        ])
        .from(TransactionDescriptionsIden::Table)
        .and_where(Expr::col(TransactionDescriptionsIden::TransactionId).is_in(transaction_ids))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn insert_dividends(models: Vec<AddTransactionDividendModel>) -> DbQueryWithValues {
    let mut builder = Query::insert()
        .into_table(TransactionDividendsIden::Table)
        .columns([
            TransactionDividendsIden::TransactionId,
            TransactionDividendsIden::SourceAssetId,
        ])
        .to_owned();

    for model in models.into_iter() {
        builder.values_panic(vec![
            model.transaction_id.into(),
            model.source_asset_id.into(),
        ]);
    }

    builder.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn get_transactions_dividends(transaction_ids: Vec<Uuid>) -> DbQueryWithValues {
    Query::select()
        .columns([
            TransactionDividendsIden::TransactionId,
            TransactionDividendsIden::SourceAssetId,
        ])
        .from(TransactionDividendsIden::Table)
        .and_where(Expr::col(TransactionDividendsIden::TransactionId).is_in(transaction_ids))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn insert_transactions(models: Vec<AddTransactionModel>) -> DbQueryWithValues {
    let mut builder2 = Query::insert()
        .into_table(TransactionIden::Table)
        .columns([
            TransactionIden::GroupId,
            TransactionIden::UserId,
            TransactionIden::TypeId,
            TransactionIden::DateTransacted,
        ])
        .returning_col(TransactionIden::Id)
        .to_owned();
    for model in models.into_iter() {
        builder2.values_panic(vec![
            model.group_id.into(),
            model.user_id.into(),
            model.transaction_type_id.into(),
            model.date.into(),
        ]);
    }
    builder2.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn update_entry(entry_id: i32, model: UpdateEntryModel) -> DbQueryWithValues {
    Query::update()
        .table(EntryIden::Table)
        .value(EntryIden::AssetId, model.asset_id)
        .value(EntryIden::AccountId, model.account_id)
        .value(EntryIden::Quantity, model.quantity)
        .value(EntryIden::CategoryId, model.category_id)
        .and_where(Expr::col(EntryIden::Id).eq(entry_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_entries_by_ids(entry_ids: Vec<i32>) -> DbQueryWithValues {
    Query::delete()
        .from_table(EntryIden::Table)
        .and_where(Expr::col(EntryIden::Id).is_in(entry_ids))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_transaction_fields(
    transaction_id: Uuid,
    model: UpdateTransactionFieldsModel,
) -> DbQueryWithValues {
    Query::update()
        .table(TransactionIden::Table)
        .value(TransactionIden::DateTransacted, model.date)
        .value(TransactionIden::TypeId, model.transaction_type_id)
        .and_where(Expr::col(TransactionIden::Id).eq(transaction_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_description(transaction_id: Uuid, description: String) -> DbQueryWithValues {
    Query::update()
        .table(TransactionDescriptionsIden::Table)
        .value(TransactionDescriptionsIden::Description, description)
        .and_where(Expr::col(TransactionDescriptionsIden::TransactionId).eq(transaction_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_descriptions_by_transaction_ids(transaction_ids: Vec<Uuid>) -> DbQueryWithValues {
    Query::delete()
        .from_table(TransactionDescriptionsIden::Table)
        .and_where(Expr::col(TransactionDescriptionsIden::TransactionId).is_in(transaction_ids))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_dividend(transaction_id: Uuid, source_asset_id: i32) -> DbQueryWithValues {
    Query::update()
        .table(TransactionDividendsIden::Table)
        .value(TransactionDividendsIden::SourceAssetId, source_asset_id)
        .and_where(Expr::col(TransactionDividendsIden::TransactionId).eq(transaction_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_dividends_by_transaction_ids(transaction_ids: Vec<Uuid>) -> DbQueryWithValues {
    Query::delete()
        .from_table(TransactionDividendsIden::Table)
        .and_where(Expr::col(TransactionDividendsIden::TransactionId).is_in(transaction_ids))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_entries_by_transaction_ids(transaction_ids: Vec<Uuid>) -> DbQueryWithValues {
    Query::delete()
        .from_table(EntryIden::Table)
        .and_where(Expr::col(EntryIden::TransactionId).is_in(transaction_ids))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_transactions_by_ids(transaction_ids: Vec<Uuid>) -> DbQueryWithValues {
    Query::delete()
        .from_table(TransactionIden::Table)
        .and_where(Expr::col(TransactionIden::Id).is_in(transaction_ids))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
