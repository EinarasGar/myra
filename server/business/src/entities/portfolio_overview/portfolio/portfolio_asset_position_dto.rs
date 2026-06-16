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
    use time::macros::datetime;

    use super::*;

    #[test]
    fn position_partial_sale_accumulates_fees_and_splits_realized_and_unrealized_gains() {
        let mut position = PortfolioAssetPosition::new(
            dec!(100),
            dec!(10),
            datetime!(2024-01-02 00:00:00 UTC),
            dec!(5),
        );

        assert_eq!(position.get_total_cost_basis(), dec!(1005));
        assert_eq!(position.get_unit_cost_basis(), dec!(100.50));

        position.sell(dec!(4), dec!(120), dec!(2));

        assert_eq!(position.sale_proceeds(), dec!(80));
        assert_eq!(position.total_fees(), dec!(7));
        assert_eq!(position.amount_sold(), dec!(4));
        assert_eq!(position.get_amount_left(), dec!(6));
        assert_eq!(position.get_realized_gains(), dec!(77.20));
        assert_eq!(position.get_unrealized_gains(dec!(130)), dec!(175.80));
        assert_eq!(position.get_total_gains(dec!(130)), dec!(253));
    }

    #[test]
    fn fees_are_counted_exactly_once_across_realized_and_unrealized() {
        let add_price = dec!(100);
        let sale_price = dec!(130);
        let current_rate = dec!(160);
        let cases = [
            (dec!(10), dec!(4), dec!(7)),
            (dec!(3), dec!(1), dec!(10)),
            (dec!(7), dec!(3), dec!(5)),
            (dec!(8), dec!(1), dec!(3)),
            (dec!(10), dec!(7), dec!(5)),
        ];

        for (added, sold, fees) in cases {
            let mut position = PortfolioAssetPosition::new(
                add_price,
                added,
                datetime!(2024-01-02 00:00:00 UTC),
                fees,
            );
            position.sell(sold, sale_price, dec!(0));
            let left = added - sold;

            let expected_total_gains =
                (sale_price - add_price) * sold + (current_rate - add_price) * left - fees;
            assert_eq!(
                position.get_realized_gains() + position.get_unrealized_gains(current_rate),
                expected_total_gains,
                "realized + unrealized must count fees once for added={added} sold={sold} fees={fees}"
            );
            assert_eq!(
                position.get_total_gains(current_rate),
                expected_total_gains,
                "total gains must count fees once for added={added} sold={sold} fees={fees}"
            );

            // For splits whose proportions are exactly representable (terminating
            // division), the fee shares embedded in the two figures must
            // reconstruct the full fee amount. Non-terminating splits (thirds,
            // sevenths) carry sub-1e-26 Decimal representation rounding in the
            // individual figures, but their sum above still counts fees once.
            if (sold / added) * added == sold {
                let realized_fee_share = position.sale_proceeds() - position.get_realized_gains();
                let unrealized_fee_share =
                    (current_rate - add_price) * left - position.get_unrealized_gains(current_rate);
                assert_eq!(
                    realized_fee_share + unrealized_fee_share,
                    fees,
                    "fee shares must sum to total fees for added={added} sold={sold} fees={fees}"
                );
            }
        }
    }

    #[test]
    fn sell_accumulates_amount_sold_sale_proceeds_and_fees_across_sells() {
        let mut position = PortfolioAssetPosition::new(
            dec!(50),
            dec!(10),
            datetime!(2024-03-22 00:00:00 UTC),
            dec!(4),
        );

        position.sell(dec!(2), dec!(60), dec!(1));
        position.sell(dec!(3), dec!(40), dec!(2));

        assert_eq!(position.amount_sold(), dec!(5));
        assert_eq!(position.sale_proceeds(), dec!(-10));
        assert_eq!(position.total_fees(), dec!(7));
        assert_eq!(position.get_amount_left(), dec!(5));
        assert_eq!(position.get_realized_gains(), dec!(-13.5));
    }

    #[test]
    fn unit_cost_basis_divides_by_quantity_added_even_when_partially_sold() {
        let mut position = PortfolioAssetPosition::new(
            dec!(2),
            dec!(5),
            datetime!(2024-03-22 00:00:00 UTC),
            dec!(5),
        );

        position.sell(dec!(3), dec!(2), dec!(5));

        assert_eq!(position.get_total_cost_basis(), dec!(20));
        assert_eq!(position.get_unit_cost_basis(), dec!(4));
    }

    #[test]
    fn new_dividend_flags_position_and_otherwise_matches_regular_position() {
        let date = datetime!(2024-05-01 00:00:00 UTC);
        let dividend = PortfolioAssetPosition::new_dividend(dec!(25), dec!(4), date, dec!(1));
        let regular = PortfolioAssetPosition::new(dec!(25), dec!(4), date, dec!(1));

        assert!(dividend.is_dividend());
        assert!(!regular.is_dividend());
        assert_eq!(dividend.add_price(), dec!(25));
        assert_eq!(dividend.units(), dec!(4));
        assert_eq!(dividend.add_date(), date);
        assert_eq!(dividend.amount_sold(), dec!(0));
        assert_eq!(dividend.sale_proceeds(), dec!(0));
        assert_eq!(
            dividend.get_total_cost_basis(),
            regular.get_total_cost_basis()
        );
        assert_eq!(
            dividend.get_unrealized_gains(dec!(30)),
            regular.get_unrealized_gains(dec!(30))
        );
    }

    #[test]
    fn merge_adds_quantity_and_fees_keeping_self_price() {
        let date = datetime!(2024-01-02 00:00:00 UTC);
        let mut position = PortfolioAssetPosition::new(dec!(100), dec!(10), date, dec!(5));
        let other = PortfolioAssetPosition::new(dec!(100), dec!(4), date, dec!(3));

        position.merge(&other);

        assert_eq!(position.units(), dec!(14));
        assert_eq!(position.total_fees(), dec!(8));
        assert_eq!(position.add_price(), dec!(100));
        assert_eq!(position.add_date(), date);
        assert_eq!(position.get_total_cost_basis(), dec!(1408));
    }

    // Characterization of the primitive's contract: merge() only folds in the
    // other position's quantity_added and fees. The other's add_price,
    // amount_sold, and sale_proceeds are silently dropped, so callers must only
    // merge unsold positions with an identical price and date (is_same_position);
    // merging anything else loses sold units / realized profit and re-bases the
    // merged units at self's price.
    #[test]
    fn merge_ignores_others_price_amount_sold_and_sale_proceeds() {
        let date = datetime!(2024-01-02 00:00:00 UTC);
        let mut position = PortfolioAssetPosition::new(dec!(100), dec!(10), date, dec!(0));
        let mut other = PortfolioAssetPosition::new(dec!(200), dec!(4), date, dec!(0));
        other.sell(dec!(2), dec!(250), dec!(1));

        position.merge(&other);

        assert_eq!(position.units(), dec!(14));
        assert_eq!(position.add_price(), dec!(100));
        assert_eq!(position.amount_sold(), dec!(0));
        assert_eq!(position.sale_proceeds(), dec!(0));
        assert_eq!(position.total_fees(), dec!(1));
        assert_eq!(position.get_amount_left(), dec!(14));
        assert_eq!(position.get_realized_gains(), dec!(0));
    }

    #[test]
    fn add_quantity_with_negative_values_shrinks_position() {
        let mut position = PortfolioAssetPosition::new(
            dec!(10),
            dec!(10),
            datetime!(2024-03-22 00:00:00 UTC),
            dec!(4),
        );

        position.add_quantity(dec!(-4), dec!(-1));

        assert_eq!(position.units(), dec!(6));
        assert_eq!(position.total_fees(), dec!(3));
        assert_eq!(position.get_amount_left(), dec!(6));
        // 10 * 6 + 3
        assert_eq!(position.get_total_cost_basis(), dec!(63));
    }
}
