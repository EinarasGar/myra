use strum::EnumCount;

#[derive(sqlx::Type, Clone, Debug, PartialEq, Eq, Hash, EnumCount)]
#[repr(i32)]
pub enum DatabaseTransactionTypeCategories {
    AssetPurchase = 1,
}

impl DatabaseTransactionTypeCategories {
    pub fn len() -> usize {
        DatabaseTransactionTypeCategories::COUNT
    }
}
