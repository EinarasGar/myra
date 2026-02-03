use rust_decimal::Decimal;

#[derive(Clone, Debug)]
pub struct AccountCashPortfolio {
    units: Decimal,
    fees: Decimal,
    dividends: Decimal,
}

impl Default for AccountCashPortfolio {
    fn default() -> Self {
        Self {
            units: Decimal::new(0, 0),
            fees: Decimal::new(0, 0),
            dividends: Decimal::new(0, 0),
        }
    }
}

impl AccountCashPortfolio {
    #[allow(dead_code)]
    pub fn new(units: Decimal, fees: Decimal, dividends: Decimal) -> Self {
        Self {
            units,
            fees,
            dividends,
        }
    }

    #[allow(dead_code)]
    pub fn units(&self) -> Decimal {
        self.units
    }

    #[allow(dead_code)]
    pub fn fees(&self) -> Decimal {
        self.fees
    }

    #[allow(dead_code)]
    pub fn dividends(&self) -> Decimal {
        self.dividends
    }

    //TODO: Add fees implementation
    pub fn add_units(&mut self, units: Decimal, _fees: Decimal) {
        self.units += units;
    }

    pub fn add_dividends(&mut self, dividends: Decimal) {
        self.dividends += dividends;
    }

    pub fn add_fees(&mut self, fees: Decimal) {
        self.fees += fees;
    }

    pub fn is_empty(&self) -> bool {
        self.units == Decimal::new(0, 0)
            && self.fees == Decimal::new(0, 0)
            && self.dividends == Decimal::new(0, 0)
    }
}
