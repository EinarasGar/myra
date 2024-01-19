use std::collections::HashMap;

use super::{
    account_asset_portfolio::AccountAssetPortfolio, account_cash_portfolio::AccountCashPortfolio,
};

#[derive(Clone, Debug, Default)]
pub struct AccountPortfolio {
    pub asset_portfolios: HashMap<i32, AccountAssetPortfolio>,
    pub cash_portfolios: HashMap<i32, AccountCashPortfolio>,
}
