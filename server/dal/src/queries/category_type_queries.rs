use sea_query::{Alias, Expr, ExprTrait, Func, Order, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::types::Uuid;

use crate::{
    idens::transaction_idens::{TransactionCategoriesIden, TransactionCategoryTypeIden},
    models::category_models::{InsertCategoryTypeModel, UpdateCategoryTypeModel},
    query_params::get_category_types_params::{
        GetCategoryTypesParams, GetCategoryTypesParamsSearchType,
    },
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn get_category_types(params: GetCategoryTypesParams) -> DbQueryWithValues {
    let mut query = Query::select();

    query
        .columns([
            (
                TransactionCategoryTypeIden::Table,
                TransactionCategoryTypeIden::Id,
            ),
            (
                TransactionCategoryTypeIden::Table,
                TransactionCategoryTypeIden::CategoryTypeName,
            ),
            (
                TransactionCategoryTypeIden::Table,
                TransactionCategoryTypeIden::UserId,
            ),
        ])
        .from(TransactionCategoryTypeIden::Table);

    query.and_where(
        Expr::col((
            TransactionCategoryTypeIden::Table,
            TransactionCategoryTypeIden::UserId,
        ))
        .is_null()
        .or(Expr::col((
            TransactionCategoryTypeIden::Table,
            TransactionCategoryTypeIden::UserId,
        ))
        .eq(params.user_id)),
    );

    match params.search_type {
        GetCategoryTypesParamsSearchType::All => {}
        GetCategoryTypesParamsSearchType::ByQuery(search_term) => {
            let search_pattern = format!("%{}%", search_term.to_lowercase());
            query.and_where(
                Func::lower(Expr::col((
                    TransactionCategoryTypeIden::Table,
                    TransactionCategoryTypeIden::CategoryTypeName,
                )))
                .like(&search_pattern),
            );
        }
    }

    query.order_by(TransactionCategoryTypeIden::CategoryTypeName, Order::Asc);
    query.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn insert_category_type(
    user_id: Uuid,
    category_type: InsertCategoryTypeModel,
) -> DbQueryWithValues {
    Query::insert()
        .into_table(TransactionCategoryTypeIden::Table)
        .columns([
            TransactionCategoryTypeIden::CategoryTypeName,
            TransactionCategoryTypeIden::UserId,
        ])
        .values_panic([category_type.category_type_name.into(), user_id.into()])
        .returning_all()
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_category_type(
    type_id: i32,
    user_id: Uuid,
    updates: UpdateCategoryTypeModel,
) -> DbQueryWithValues {
    Query::update()
        .table(TransactionCategoryTypeIden::Table)
        .value(
            TransactionCategoryTypeIden::CategoryTypeName,
            updates.category_type_name,
        )
        .and_where(Expr::col(TransactionCategoryTypeIden::Id).eq(type_id))
        .and_where(Expr::col(TransactionCategoryTypeIden::UserId).eq(user_id))
        .returning_all()
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_category_type(type_id: i32, user_id: Uuid) -> DbQueryWithValues {
    Query::delete()
        .from_table(TransactionCategoryTypeIden::Table)
        .and_where(Expr::col(TransactionCategoryTypeIden::Id).eq(type_id))
        .and_where(Expr::col(TransactionCategoryTypeIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn check_category_type_usage(type_id: i32) -> DbQueryWithValues {
    Query::select()
        .expr_as(
            Func::count(Expr::col(TransactionCategoriesIden::Id)),
            Alias::new("count"),
        )
        .from(TransactionCategoriesIden::Table)
        .and_where(Expr::col(TransactionCategoriesIden::CategoryType).eq(type_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_user_category_type_count(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .expr_as(
            Func::count(Expr::col(TransactionCategoryTypeIden::Id)),
            Alias::new("count"),
        )
        .from(TransactionCategoryTypeIden::Table)
        .and_where(Expr::col(TransactionCategoryTypeIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn check_duplicate_category_type_name(
    type_name: &str,
    user_id: Option<Uuid>,
) -> DbQueryWithValues {
    let mut query = Query::select();

    query
        .expr(Func::count(Expr::col(TransactionCategoryTypeIden::Id)))
        .from(TransactionCategoryTypeIden::Table)
        .and_where(
            Func::lower(Expr::col(TransactionCategoryTypeIden::CategoryTypeName))
                .eq(type_name.to_lowercase()),
        );

    match user_id {
        Some(uid) => {
            query.and_where(
                Expr::col(TransactionCategoryTypeIden::UserId)
                    .is_null()
                    .or(Expr::col(TransactionCategoryTypeIden::UserId).eq(uid)),
            );
        }
        None => {
            query.and_where(Expr::col(TransactionCategoryTypeIden::UserId).is_null());
        }
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}
