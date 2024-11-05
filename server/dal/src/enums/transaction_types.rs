#[derive(sqlx::Type, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[repr(i32)]
pub enum DatabaseTransactionTypes {
    RegularTransaction = 1,
    CashTransferOut = 2,
    CashTransferIn = 3,
    CashDividend = 4,
    AssetTransferOut = 5,
    AssetTransferIn = 6,
    AssetTrade = 7,
    AssetSale = 8,
    AssetPurchase = 9,
    AssetDividend = 10,
    AssetBalanceTransfer = 11,
    AccountFees = 12,
}
