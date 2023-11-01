#[derive(Debug, sqlx::Type, PartialEq, Eq, Clone)]
#[sqlx(type_name = "category_type")]
#[sqlx(rename_all = "lowercase")]
pub enum TransactionCategoryType {
    Fees,
    Investments,
}
