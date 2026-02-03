use strum::EnumCount;

#[derive(sqlx::Type, Clone, Debug, PartialEq, Eq, Hash, EnumCount)]
#[repr(i32)]
pub enum DatabaseTransactionTypeCategories {
    AssetPurchase = 1,
    AssetSale = 2,
    CashTransferIn = 3,
    CashDividend = 4,
    AssetDividend = 5,
}

impl DatabaseTransactionTypeCategories {
    pub fn len() -> usize {
        DatabaseTransactionTypeCategories::COUNT
    }
}
