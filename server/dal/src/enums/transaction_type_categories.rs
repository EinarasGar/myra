use strum::EnumCount;

#[derive(sqlx::Type, Clone, Debug, PartialEq, Eq, Hash, EnumCount)]
#[repr(i32)]
pub enum DatabaseTransactionTypeCategories {
    AssetPurchase = 1,
    AssetSale = 2,
    CashTransferIn = 3,
    CashDividend = 4,
    AssetDividend = 5,
    CashTransferOut = 6,
    AssetTransferOut = 7,
    AssetTransferIn = 8,
    AssetTrade = 9,
    AssetBalanceTransfer = 10,
    AccountFees = 11,
}

impl DatabaseTransactionTypeCategories {
    pub fn len() -> usize {
        DatabaseTransactionTypeCategories::COUNT
    }
}
