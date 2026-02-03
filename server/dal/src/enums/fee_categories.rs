use strum::EnumCount;

#[derive(sqlx::Type, Clone, Debug, PartialEq, Eq, Hash, EnumCount)]
#[repr(i32)]
pub enum DatabaseFeeCategories {
    Transaction = 1,
    Exchange = 2,
    WithholdingTax = 3,
}

impl DatabaseFeeCategories {
    pub fn len() -> usize {
        DatabaseFeeCategories::COUNT
    }
}
