use crate::enums::transaction_type_categories::DatabaseTransactionTypeCategories;

#[derive(Clone, Debug, sqlx::FromRow)]
pub struct TransactionCategoryTransactionTypeEnumModel {
    pub enum_index: DatabaseTransactionTypeCategories,
    pub category_mapping: i32,
}
