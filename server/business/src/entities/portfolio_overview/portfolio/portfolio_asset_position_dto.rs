use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use time::OffsetDateTime;

#[derive(Clone)]
pub struct PortfolioAssetPosition {
    add_price: Decimal,
    quantity_added: Decimal,
    add_date: OffsetDateTime,
    fees: Decimal,
    amount_sold: Decimal,
    sale_proceeds: Decimal,
    is_dividend: bool,
}

impl PortfolioAssetPosition {
    pub fn new(
        add_price: Decimal,
        quantity_added: Decimal,
        add_date: OffsetDateTime,
        fees: Decimal,
    ) -> Self {
        Self {
            add_price,
            quantity_added,
            add_date,
            fees,
            amount_sold: dec!(0),
            sale_proceeds: dec!(0),
            is_dividend: false,
        }
    }

    pub fn new_dividend(
        add_price: Decimal,
        quantity_added: Decimal,
        add_date: OffsetDateTime,
        fees: Decimal,
    ) -> Self {
        Self {
            is_dividend: true,
            ..Self::new(add_price, quantity_added, add_date, fees)
        }
    }

    pub fn sell(&mut self, quantity: Decimal, price: Decimal, fees: Decimal) {
        self.amount_sold += quantity;
        self.sale_proceeds += (price - self.add_price) * quantity;
        self.fees += fees;
    }

    pub fn add_fees(&mut self, fees: Decimal) {
        self.fees += fees;
    }

    pub fn add_quantity(&mut self, quantity: Decimal, fees: Decimal) {
        self.quantity_added += quantity;
        self.fees += fees;
    }

    pub fn is_same_position(&self, other: &PortfolioAssetPosition) -> bool {
        self.add_price == other.add_price && self.add_date == other.add_date
    }

    pub fn get_unit_cost_basis(&self) -> Decimal {
        self.get_total_cost_basis() / self.quantity_added
    }

    pub fn get_total_cost_basis(&self) -> Decimal {
        self.add_price * self.quantity_added + self.fees
    }

    pub fn get_realized_gains(&self) -> Decimal {
        self.sale_proceeds - self.fees * (self.amount_sold / self.quantity_added)
    }

    pub fn get_unrealized_gains(&self, current_rate: Decimal) -> Decimal {
        ((current_rate - self.add_price) * self.get_amount_left())
            - self.fees * (self.get_amount_left() / self.quantity_added)
    }

    pub fn get_total_gains(&self, current_rate: Decimal) -> Decimal {
        self.get_realized_gains() + self.get_unrealized_gains(current_rate)
    }

    pub fn get_amount_left(&self) -> Decimal {
        self.quantity_added - self.amount_sold
    }

    pub fn units(&self) -> Decimal {
        self.quantity_added
    }

    pub fn total_fees(&self) -> Decimal {
        self.fees
    }

    pub fn compare_by_date(&self, other: &PortfolioAssetPosition) -> std::cmp::Ordering {
        self.add_date.cmp(&other.add_date)
    }

    pub fn add_date(&self) -> OffsetDateTime {
        self.add_date
    }

    pub fn merge(&mut self, other: &PortfolioAssetPosition) {
        self.add_quantity(other.quantity_added, other.fees);
    }

    pub fn add_price(&self) -> Decimal {
        self.add_price
    }

    #[allow(dead_code)]
    pub fn amount_sold(&self) -> Decimal {
        self.amount_sold
    }

    pub fn is_dividend(&self) -> bool {
        self.is_dividend
    }

    pub fn sale_proceeds(&self) -> Decimal {
        self.sale_proceeds
    }
}

impl std::fmt::Debug for PortfolioAssetPosition {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        f.debug_struct("PortfolioAssetPosition")
            .field("add_price", &self.add_price)
            .field("quantity_added", &self.quantity_added)
            .field("add_date", &self.add_date)
            .field("fees", &self.fees)
            .field("amount_sold", &self.amount_sold)
            .field("sale_proceeds", &self.sale_proceeds)
            .field("total_fees()", &self.total_fees())
            .field("get_amount_left()", &self.get_amount_left())
            .field("get_unit_cost_basis()", &self.get_unit_cost_basis())
            .field("get_total_cost_basis()", &self.get_total_cost_basis())
            .field("get_realized_gains()", &self.get_realized_gains())
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal_macros::dec;

    use super::*;

    #[test]
    fn test_get_amount_left() {
        let mut position = PortfolioAssetPosition::new(
            dec!(1.0),
            dec!(10.0),
            OffsetDateTime::now_utc(),
            dec!(0.0),
        );
        position.sell(dec!(5), dec!(10), dec!(0.0));

        assert_eq!(position.get_amount_left(), dec!(5.0));
    }

    #[test]
    fn test_get_unit_cost_basis() {
        let position =
            PortfolioAssetPosition::new(dec!(2), dec!(5), OffsetDateTime::now_utc(), dec!(5));

        assert_eq!(position.get_unit_cost_basis(), dec!(3));
    }

    #[test]
    fn test_total_cost_basis() {
        let position =
            PortfolioAssetPosition::new(dec!(2), dec!(5), OffsetDateTime::now_utc(), dec!(5));

        assert_eq!(position.get_total_cost_basis(), dec!(15));
    }

    #[test]
    fn test_get_realized_gains() {
        let mut position =
            PortfolioAssetPosition::new(dec!(10), dec!(10), OffsetDateTime::now_utc(), dec!(50));

        position.sell(dec!(1), dec!(20), dec!(0));

        assert_eq!(position.get_realized_gains(), dec!(5));
    }

    #[test]
    fn test_get_unrealized_gains() {
        let position =
            PortfolioAssetPosition::new(dec!(10), dec!(10), OffsetDateTime::now_utc(), dec!(50));

        let current_rate = dec!(20);
        assert_eq!(position.get_unrealized_gains(current_rate), dec!(50));
    }

    #[test]
    fn test_get_total_gains() {
        let mut position =
            PortfolioAssetPosition::new(dec!(10), dec!(10), OffsetDateTime::now_utc(), dec!(50));

        position.sell(dec!(5), dec!(16), dec!(0));

        let current_rate = dec!(20);
        //Realized 30 - 25 fee = 5
        //Unrealized 50 - 25 fee = 25
        //Total 30
        println!("{:#?}", position);
        assert_eq!(position.get_total_gains(current_rate), dec!(30));
    }
}
