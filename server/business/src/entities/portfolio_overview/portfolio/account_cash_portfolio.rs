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

    pub fn add_units(&mut self, units: Decimal) {
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

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn is_empty_true_when_additions_cancel_back_to_zero() {
        let mut cash = AccountCashPortfolio::default();

        cash.add_units(dec!(100));
        cash.add_units(dec!(-100));
        cash.add_fees(dec!(2.5));
        cash.add_fees(dec!(-2.5));
        cash.add_dividends(dec!(7));
        cash.add_dividends(dec!(-7));

        assert!(cash.is_empty());
    }

    #[test]
    fn negative_zero_still_counts_as_empty() {
        let cash = AccountCashPortfolio::new(-dec!(0), -dec!(0), -dec!(0));

        assert!(cash.is_empty());
    }

    #[test]
    fn negative_zero_from_cancellation_with_fractional_amounts_counts_as_empty() {
        let mut cash = AccountCashPortfolio::default();

        cash.add_units(dec!(-0.50));
        cash.add_units(dec!(0.50));

        assert_eq!(cash.units(), dec!(0));
        assert!(cash.is_empty());
    }
}
