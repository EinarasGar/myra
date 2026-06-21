use sea_query::{Expr, ExprTrait, PostgresQueryBuilder, Query};
use sea_query_sqlx::SqlxBinder;

use crate::{
    enums::DatabaseCategoryEnumTypes,
    idens::transaction_idens::TransactionCategoriesStaticMappingIden,
};

use super::DbQueryWithValues;

#[macros::named_query]
pub fn get_fee_enum_mappings() -> DbQueryWithValues {
    Query::select()
        .columns([
            TransactionCategoriesStaticMappingIden::EnumIndex,
            TransactionCategoriesStaticMappingIden::CategoryMapping,
        ])
        .from(TransactionCategoriesStaticMappingIden::Table)
        .and_where(
            Expr::col(TransactionCategoriesStaticMappingIden::EnumId)
                .eq(DatabaseCategoryEnumTypes::Fee as i32),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn get_transaction_type_enum_mappings() -> DbQueryWithValues {
    Query::select()
        .columns([
            TransactionCategoriesStaticMappingIden::EnumIndex,
            TransactionCategoriesStaticMappingIden::CategoryMapping,
        ])
        .from(TransactionCategoriesStaticMappingIden::Table)
        .and_where(
            Expr::col(TransactionCategoriesStaticMappingIden::EnumId)
                .eq(DatabaseCategoryEnumTypes::TransactionType as i32),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
