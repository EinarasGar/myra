use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct CashTransferOut {
    pub date: OffsetDateTime,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub units: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for CashTransferOut {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        let cash = portfolio.get_cash_portfolio(self.account_id, self.asset_id);
        cash.add_units(-self.units - self.fees);
        cash.add_fees(self.fees);
    }

    fn date(&self) -> OffsetDateTime {
        self.date
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal_macros::dec;
    use time::macros::datetime;

    use crate::entities::portfolio_overview::investment_transaction::cash_transfer_in::CashTransferIn;

    use super::*;

    #[test]
    fn transfer_out_cash_deducts_cash() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id,
                fees: dec!(0),
                units: dec!(20),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashTransferOut {
                asset_id: 10,
                account_id,
                fees: dec!(0),
                units: dec!(5),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account 1");

        let cash_portfolio = account_portfolio
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(15));
    }

    // The entity layer (CashTransferOutTransaction::get_portfolio_action) passes
    // units as entry.quantity.abs() and negates the negative ledger fee entries,
    // so this action receives positive units and positive fee scalars; the cash
    // balance drops by units plus fees.
    #[test]
    fn transfer_out_with_fee_debits_units_plus_fee() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashTransferOut {
                asset_id: 10,
                account_id,
                fees: dec!(2),
                units: dec!(30),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(68));
        assert_eq!(cash_portfolio.fees(), dec!(2));
    }

    #[test]
    fn transfer_out_without_prior_balance_goes_negative() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(CashTransferOut {
            asset_id: 10,
            account_id,
            fees: dec!(5),
            units: dec!(50),
            date: datetime!(2000-03-22 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(-55));
        assert_eq!(cash_portfolio.fees(), dec!(5));
    }

    #[test]
    fn transfer_out_fees_accumulate_across_multiple_transfers() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id,
                fees: dec!(0),
                units: dec!(1000),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashTransferOut {
                asset_id: 10,
                account_id,
                fees: dec!(1),
                units: dec!(10),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
            Box::new(CashTransferOut {
                asset_id: 10,
                account_id,
                fees: dec!(2),
                units: dec!(20),
                date: datetime!(2000-03-24 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash");

        assert_eq!(cash_portfolio.units(), dec!(967));
        assert_eq!(cash_portfolio.fees(), dec!(3));
    }

    #[test]
    fn transfer_out_only_affects_its_own_currency() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 1,
                account_id,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashTransferIn {
                asset_id: 2,
                account_id,
                fees: dec!(0),
                units: dec!(200),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashTransferOut {
                asset_id: 1,
                account_id,
                fees: dec!(3),
                units: dec!(40),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let account_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Should contain account");

        let currency_1 = account_portfolio
            .cash_portfolios
            .get(&1)
            .expect("Should contain currency 1");
        assert_eq!(currency_1.units(), dec!(57));
        assert_eq!(currency_1.fees(), dec!(3));

        let currency_2 = account_portfolio
            .cash_portfolios
            .get(&2)
            .expect("Should contain currency 2");
        assert_eq!(currency_2.units(), dec!(200));
        assert_eq!(currency_2.fees(), dec!(0));
    }

    #[test]
    fn transfer_out_keeps_other_accounts_untouched() {
        let mut portfolio = Portfolio::new();
        let account_a = Uuid::new_v4();
        let account_b = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id: account_a,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id: account_b,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashTransferOut {
                asset_id: 10,
                account_id: account_a,
                fees: dec!(1),
                units: dec!(60),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let cash_a = portfolio
            .account_portfolios()
            .get(&account_a)
            .expect("Should contain account a")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash a");
        assert_eq!(cash_a.units(), dec!(39));
        assert_eq!(cash_a.fees(), dec!(1));

        let cash_b = portfolio
            .account_portfolios()
            .get(&account_b)
            .expect("Should contain account b")
            .cash_portfolios
            .get(&10)
            .expect("Should contain cash b");
        assert_eq!(cash_b.units(), dec!(100));
        assert_eq!(cash_b.fees(), dec!(0));
    }

    #[test]
    fn cash_portfolio_netting_to_exactly_zero_is_pruned() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashTransferOut {
                asset_id: 10,
                account_id,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        assert!(portfolio.account_portfolios().get(&account_id).is_none());
    }

    #[test]
    fn zero_balance_with_nonzero_fees_survives_pruning() {
        let mut portfolio = Portfolio::new();
        let account_id = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 10,
                account_id,
                fees: dec!(2),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashTransferOut {
                asset_id: 10,
                account_id,
                fees: dec!(2),
                units: dec!(96),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let cash_portfolio = portfolio
            .account_portfolios()
            .get(&account_id)
            .expect("Account with fees paid must survive pruning")
            .cash_portfolios
            .get(&10)
            .expect("Cash portfolio with fees paid must survive pruning");

        assert_eq!(cash_portfolio.units(), dec!(0));
        assert_eq!(cash_portfolio.fees(), dec!(4));
    }
}
