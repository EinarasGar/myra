pub mod fee_categories;
pub mod transaction_type_categories;
pub mod transaction_types;

#[derive(sqlx::Type, Clone, Debug, PartialEq, Eq, Hash)]
#[repr(i32)]
pub enum DatabaseCategoryEnumTypes {
    Fee = 1,
    TransactionType = 2,
}
