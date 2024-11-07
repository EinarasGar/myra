use sea_query::{Expr, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::types::Uuid;

use crate::{
    idens::transaction_idens::{TransactionDescriptionsIden, TransactionIden},
    models::transaction_models::{AddTransactionDescriptionModel, AddTransactionModel},
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
