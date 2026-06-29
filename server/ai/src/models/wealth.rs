use rust_decimal::Decimal;
use serde::Serialize;
use uuid::Uuid;

#[derive(Serialize)]
pub struct CurrencyRef {
    pub asset_id: i32,
    pub code: String,
}

#[derive(Serialize)]
pub struct HoldingRow {
    pub asset_id: i32,
    pub asset_name: String,
    pub ticker: Option<String>,
    pub asset_type: String,
    pub denominating_currency: Option<String>,
    pub account_id: Uuid,
    pub account_name: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub units: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision_option")]
    pub value: Option<Decimal>,
}

#[derive(Serialize)]
pub struct HoldingGroup {
    pub key: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub value: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub share_pct: Decimal,
}

#[derive(Serialize)]
pub struct HoldingsResult {
    pub reference_currency: CurrencyRef,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub total_value: Decimal,
    pub holdings: Vec<HoldingRow>,
    pub groups: Option<Vec<HoldingGroup>>,
    pub unvalued_assets: Vec<String>,
}

#[derive(Serialize)]
pub struct PortfolioPositionRow {
    pub add_date: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub add_price: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub quantity_added: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount_sold: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount_left: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub fees: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub total_cost_basis: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub realized_gains: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub unrealized_gains: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub total_gains: Decimal,
    pub is_dividend: bool,
}

#[derive(Serialize)]
pub struct PortfolioAssetRow {
    pub asset_id: i32,
    pub asset_name: String,
    pub ticker: Option<String>,
    pub account_id: Uuid,
    pub account_name: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub total_units: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub remaining_units: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub unit_cost_basis: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub total_cost_basis: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub market_value: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub realized_gains: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub unrealized_gains: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub total_gains: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub total_fees: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub cash_dividends: Decimal,
    pub positions: Option<Vec<PortfolioPositionRow>>,
}

#[derive(Serialize)]
pub struct PortfolioCashRow {
    pub currency: String,
    pub account_id: Uuid,
    pub account_name: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub cash_balance: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub fees: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub dividends: Decimal,
}

#[derive(Serialize)]
pub struct PortfolioOverviewTotals {
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub market_value: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub total_cost_basis: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub realized_gains: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub unrealized_gains: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub total_gains: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub total_fees: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub cash_dividends: Decimal,
}

#[derive(Serialize)]
pub struct PortfolioOverviewResult {
    pub reference_currency: CurrencyRef,
    pub totals: PortfolioOverviewTotals,
    pub assets: Vec<PortfolioAssetRow>,
    pub cash: Vec<PortfolioCashRow>,
}

#[derive(Serialize)]
pub struct NetWorthHistoryPoint {
    pub date: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub value: Decimal,
}

#[derive(Serialize)]
pub struct NetWorthHistoryResult {
    pub reference_currency: CurrencyRef,
    pub range: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub start_value: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub end_value: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub change: Decimal,
    #[serde(with = "rust_decimal::serde::arbitrary_precision_option")]
    pub change_pct: Option<Decimal>,
    pub points: Vec<NetWorthHistoryPoint>,
}

#[derive(Serialize)]
pub struct AssetPricePoint {
    pub date: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub price: Decimal,
}

#[derive(Serialize)]
pub struct AssetPriceResult {
    pub asset_id: i32,
    pub asset_name: String,
    pub ticker: Option<String>,
    pub quote_currency: CurrencyRef,
    #[serde(with = "rust_decimal::serde::arbitrary_precision_option")]
    pub price: Option<Decimal>,
    pub as_of: Option<String>,
    pub points: Option<Vec<AssetPricePoint>>,
}
