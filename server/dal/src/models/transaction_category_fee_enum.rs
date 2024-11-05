use crate::enums::fee_categories::DatabaseFeeCategories;

#[derive(Clone, Debug, sqlx::FromRow)]
pub struct TransactionCategoryFeeEnumModel {
    pub enum_index: DatabaseFeeCategories,
    pub category_mapping: i32,
}
