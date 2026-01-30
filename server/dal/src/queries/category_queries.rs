use sea_query::{
    Alias, Asterisk, Expr, ExprTrait, Func, Order, PostgresQueryBuilder, Query, WindowStatement,
};
use sea_query_sqlx::SqlxBinder;
use sqlx::types::Uuid;

use crate::{
    idens::{
        entries_idens::EntryIden,
        transaction_idens::{
            TransactionCategoriesIden, TransactionCategoriesStaticMappingIden,
            TransactionCategoryTypeIden,
        },
    },
    models::category_models::{InsertCategoryModel, UpdateCategoryModel},
    query_params::{
        get_categories_params::{GetCategoriesParams, GetCategoriesParamsSearchType},
        get_category_count_params::{CategoryCountFilter, GetCategoryCountParams},
    },
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn get_categories(params: GetCategoriesParams) -> DbQueryWithValues {
    let mut query = Query::select();

    query
        .column((
            TransactionCategoriesIden::Table,
            TransactionCategoriesIden::Id,
        ))
        .column((
            TransactionCategoriesIden::Table,
            TransactionCategoriesIden::Category,
        ))
        .column((
            TransactionCategoriesIden::Table,
            TransactionCategoriesIden::Icon,
        ))
        .column((
            TransactionCategoriesIden::Table,
            TransactionCategoriesIden::UserId,
        ))
        .expr_as(
            Expr::col((
                TransactionCategoriesIden::Table,
                TransactionCategoriesIden::CategoryType,
            )),
            Alias::new("category_type_id"),
        )
        .expr_as(
            Expr::col((
                TransactionCategoryTypeIden::Table,
                TransactionCategoryTypeIden::CategoryTypeName,
            )),
            Alias::new("category_type_name"),
        )
        .expr_as(
            Expr::col((
                TransactionCategoryTypeIden::Table,
                TransactionCategoryTypeIden::UserId,
            )),
            Alias::new("category_type_user_id"),
        )
        .expr_as(
            Expr::exists(
                Query::select()
                    .column(TransactionCategoriesStaticMappingIden::CategoryMapping)
                    .from(TransactionCategoriesStaticMappingIden::Table)
                    .and_where(
                        Expr::col(TransactionCategoriesStaticMappingIden::CategoryMapping).equals(
                            (
                                TransactionCategoriesIden::Table,
                                TransactionCategoriesIden::Id,
                            ),
                        ),
                    )
                    .to_owned(),
            ),
            Alias::new("is_system"),
        );

    if params.paging.is_some() {
        query.expr_window_as(
            Expr::col(Asterisk).count(),
            WindowStatement::default(),
            Alias::new("total_results"),
        );
    }

    query.from(TransactionCategoriesIden::Table).inner_join(
        TransactionCategoryTypeIden::Table,
        Expr::col((
            TransactionCategoriesIden::Table,
            TransactionCategoriesIden::CategoryType,
        ))
        .equals((
            TransactionCategoryTypeIden::Table,
            TransactionCategoryTypeIden::Id,
        )),
    );

    if let Some(user_id) = params.user_id {
        query.and_where(
            Expr::col((
                TransactionCategoriesIden::Table,
                TransactionCategoriesIden::UserId,
            ))
            .eq(user_id),
        );
    } else {
        query.and_where(
            Expr::col((
                TransactionCategoriesIden::Table,
                TransactionCategoriesIden::UserId,
            ))
            .is_null(),
        );
    }

    match params.search_type {
        GetCategoriesParamsSearchType::ById(category_id) => {
            query.and_where(
                Expr::col((
                    TransactionCategoriesIden::Table,
                    TransactionCategoriesIden::Id,
                ))
                .eq(category_id),
            );
        }
        GetCategoriesParamsSearchType::All => {}
        GetCategoriesParamsSearchType::ByQuery(search_term) => {
            let search_pattern = format!("%{}%", search_term.to_lowercase());
            query.and_where(
                Func::lower(Expr::col((
                    TransactionCategoriesIden::Table,
                    TransactionCategoriesIden::Category,
                )))
                .like(&search_pattern)
                .or(Func::lower(Expr::col((
                    TransactionCategoryTypeIden::Table,
                    TransactionCategoryTypeIden::CategoryTypeName,
                )))
                .like(&search_pattern)),
            );
        }
        GetCategoriesParamsSearchType::ByType(type_id) => {
            query.and_where(
                Expr::col((
                    TransactionCategoriesIden::Table,
                    TransactionCategoriesIden::CategoryType,
                ))
                .eq(type_id),
            );
        }
        GetCategoriesParamsSearchType::ByQueryAndType {
            query: search_term,
            type_id,
        } => {
            let search_pattern = format!("%{}%", search_term.to_lowercase());
            query.and_where(
                Func::lower(Expr::col((
                    TransactionCategoriesIden::Table,
                    TransactionCategoriesIden::Category,
                )))
                .like(&search_pattern)
                .or(Func::lower(Expr::col((
                    TransactionCategoryTypeIden::Table,
                    TransactionCategoryTypeIden::CategoryTypeName,
                )))
                .like(&search_pattern)),
            );
            query.and_where(
                Expr::col((
                    TransactionCategoriesIden::Table,
                    TransactionCategoriesIden::CategoryType,
                ))
                .eq(type_id),
            );
        }
    }

    query.order_by(TransactionCategoriesIden::Category, Order::Asc);

    if let Some(paging) = params.paging {
        query.limit(paging.count).offset(paging.start);
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn insert_category(user_id: Uuid, category: InsertCategoryModel) -> DbQueryWithValues {
    Query::insert()
        .into_table(TransactionCategoriesIden::Table)
        .columns([
            TransactionCategoriesIden::Category,
            TransactionCategoriesIden::Icon,
            TransactionCategoriesIden::CategoryType,
            TransactionCategoriesIden::UserId,
        ])
        .values_panic([
            category.category.into(),
            category.icon.into(),
            category.category_type.into(),
            user_id.into(),
        ])
        .returning_col(TransactionCategoriesIden::Id)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_category(
    category_id: i32,
    user_id: Uuid,
    updates: UpdateCategoryModel,
) -> DbQueryWithValues {
    Query::update()
        .table(TransactionCategoriesIden::Table)
        .value(TransactionCategoriesIden::Category, updates.category)
        .value(TransactionCategoriesIden::Icon, updates.icon)
        .value(
            TransactionCategoriesIden::CategoryType,
            updates.category_type,
        )
        .and_where(Expr::col(TransactionCategoriesIden::Id).eq(category_id))
        .and_where(Expr::col(TransactionCategoriesIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_category(category_id: i32, user_id: Uuid) -> DbQueryWithValues {
    Query::delete()
        .from_table(TransactionCategoriesIden::Table)
        .and_where(Expr::col(TransactionCategoriesIden::Id).eq(category_id))
        .and_where(Expr::col(TransactionCategoriesIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_category_count(params: GetCategoryCountParams) -> DbQueryWithValues {
    let mut query = Query::select();

    query.expr_as(Expr::col(Asterisk).count(), Alias::new("count"));

    match params.filter {
        CategoryCountFilter::ByUserId(user_id) => {
            query
                .from(TransactionCategoriesIden::Table)
                .and_where(Expr::col(TransactionCategoriesIden::UserId).eq(user_id));
        }
        CategoryCountFilter::ByCategoryId(category_id) => {
            query
                .from(EntryIden::Table)
                .and_where(Expr::col(EntryIden::CategoryId).eq(category_id));
        }
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn check_duplicate_category_name(
    category_name: &str,
    user_id: Option<Uuid>,
) -> DbQueryWithValues {
    let mut query = Query::select();

    query
        .expr(Func::count(Expr::col(TransactionCategoriesIden::Id)))
        .from(TransactionCategoriesIden::Table)
        .and_where(
            Func::lower(Expr::col(TransactionCategoriesIden::Category))
                .eq(category_name.to_lowercase()),
        );

    match user_id {
        Some(uid) => {
            query.and_where(
                Expr::col(TransactionCategoriesIden::UserId)
                    .is_null()
                    .or(Expr::col(TransactionCategoriesIden::UserId).eq(uid)),
            );
        }
        None => {
            query.and_where(Expr::col(TransactionCategoriesIden::UserId).is_null());
        }
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}
