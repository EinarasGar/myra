#[derive(Debug, sqlx::Type, PartialEq, Eq, Clone)]
#[sqlx(type_name = "portfolio_event_type")]
#[sqlx(rename_all = "lowercase")]
pub enum PortfolioEventType {
    AccountFees,
    BalanceTransfer,
    AssetPurhcase,
    AssetSale,
    AssetTrade,
    AssetTransferIn,
    AssetTransferOut,
    CashTransferIn,
    CashTransferOut,
    AssetDividend,
    CashDividend,
}
