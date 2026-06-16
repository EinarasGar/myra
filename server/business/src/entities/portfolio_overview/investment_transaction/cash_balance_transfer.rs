use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct CashBalanceTransfer {
    pub date: OffsetDateTime,
    pub asset_id: i32,
    pub account_from: Uuid,
    pub account_to: Uuid,
    pub units: Decimal,
    pub fees: Decimal,
}

impl PortfolioAction for CashBalanceTransfer {
    fn update_porfolio(&self, portfolio: &mut Portfolio) {
        let source = portfolio.get_cash_portfolio(self.account_from, self.asset_id);
        source.add_units(-self.units - self.fees);
        source.add_fees(self.fees);

        let destination = portfolio.get_cash_portfolio(self.account_to, self.asset_id);
        destination.add_units(self.units);
    }

    fn date(&self) -> OffsetDateTime {
        self.date
    }
}

#[cfg(test)]
mod tests {
    use rust_decimal_macros::dec;
    use time::macros::datetime;

    use crate::entities::portfolio_overview::investment_transaction::{
        cash_transfer_in::CashTransferIn, cash_transfer_out::CashTransferOut,
    };

    use super::*;

    #[test]
    fn balance_transfer_moves_cash_between_accounts() {
        let mut portfolio = Portfolio::new();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 1,
                account_id: account_from,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashBalanceTransfer {
                asset_id: 1,
                account_from,
                account_to,
                units: dec!(40),
                fees: dec!(0),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let source_cash = portfolio
            .account_portfolios()
            .get(&account_from)
            .expect("Should contain source account")
            .cash_portfolios
            .get(&1)
            .expect("Should contain cash");
        let destination_cash = portfolio
            .account_portfolios()
            .get(&account_to)
            .expect("Should contain destination account")
            .cash_portfolios
            .get(&1)
            .expect("Should contain cash");

        assert_eq!(source_cash.units(), dec!(60));
        assert_eq!(destination_cash.units(), dec!(40));
    }

    #[test]
    fn balance_transfer_charges_fee_to_source_account() {
        let mut portfolio = Portfolio::new();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 1,
                account_id: account_from,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashBalanceTransfer {
                asset_id: 1,
                account_from,
                account_to,
                units: dec!(40),
                fees: dec!(1.5),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let source_cash = portfolio
            .account_portfolios()
            .get(&account_from)
            .expect("Should contain source account")
            .cash_portfolios
            .get(&1)
            .expect("Should contain cash");
        let destination_cash = portfolio
            .account_portfolios()
            .get(&account_to)
            .expect("Should contain destination account")
            .cash_portfolios
            .get(&1)
            .expect("Should contain cash");

        assert_eq!(source_cash.units(), dec!(58.5));
        assert_eq!(source_cash.fees(), dec!(1.5));
        assert_eq!(destination_cash.units(), dec!(40));
        assert_eq!(destination_cash.fees(), dec!(0));
    }

    #[test]
    fn balance_transfer_does_not_touch_asset_portfolios() {
        let mut portfolio = Portfolio::new();
        let account_from = Uuid::new_v4();
        let account_to = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![Box::new(CashBalanceTransfer {
            asset_id: 1,
            account_from,
            account_to,
            units: dec!(40),
            fees: dec!(0),
            date: datetime!(2000-03-23 00:00:00 UTC),
        })];

        portfolio.process_transactions(input);

        let source = portfolio
            .account_portfolios()
            .get(&account_from)
            .expect("Should contain source account");
        let destination = portfolio
            .account_portfolios()
            .get(&account_to)
            .expect("Should contain destination account");

        assert!(source.asset_portfolios.is_empty());
        assert!(destination.asset_portfolios.is_empty());
        assert_eq!(source.cash_portfolios.get(&1).unwrap().units(), dec!(-40));
        assert_eq!(
            destination.cash_portfolios.get(&1).unwrap().units(),
            dec!(40)
        );
    }

    #[test]
    fn chained_transfers_move_cash_across_three_accounts() {
        let mut portfolio = Portfolio::new();
        let account_a = Uuid::new_v4();
        let account_b = Uuid::new_v4();
        let account_c = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 1,
                account_id: account_a,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashBalanceTransfer {
                asset_id: 1,
                account_from: account_a,
                account_to: account_b,
                units: dec!(60),
                fees: dec!(2),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
            Box::new(CashBalanceTransfer {
                asset_id: 1,
                account_from: account_b,
                account_to: account_c,
                units: dec!(25),
                fees: dec!(1),
                date: datetime!(2000-03-24 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let cash = |account: &Uuid| {
            portfolio
                .account_portfolios()
                .get(account)
                .expect("Should contain account")
                .cash_portfolios
                .get(&1)
                .expect("Should contain cash")
        };

        assert_eq!(cash(&account_a).units(), dec!(38));
        assert_eq!(cash(&account_a).fees(), dec!(2));
        assert_eq!(cash(&account_b).units(), dec!(34));
        assert_eq!(cash(&account_b).fees(), dec!(1));
        assert_eq!(cash(&account_c).units(), dec!(25));
        assert_eq!(cash(&account_c).fees(), dec!(0));
    }

    #[test]
    fn balance_transfer_interleaves_with_cash_transfers_on_both_accounts() {
        let mut portfolio = Portfolio::new();
        let account_a = Uuid::new_v4();
        let account_b = Uuid::new_v4();

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: 1,
                account_id: account_a,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashTransferIn {
                asset_id: 1,
                account_id: account_b,
                fees: dec!(0),
                units: dec!(50),
                date: datetime!(2000-03-22 12:00:00 UTC),
            }),
            Box::new(CashBalanceTransfer {
                asset_id: 1,
                account_from: account_a,
                account_to: account_b,
                units: dec!(30),
                fees: dec!(0),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
            Box::new(CashTransferOut {
                asset_id: 1,
                account_id: account_a,
                fees: dec!(0),
                units: dec!(10),
                date: datetime!(2000-03-24 00:00:00 UTC),
            }),
            Box::new(CashTransferOut {
                asset_id: 1,
                account_id: account_b,
                fees: dec!(1),
                units: dec!(20),
                date: datetime!(2000-03-25 00:00:00 UTC),
            }),
            Box::new(CashTransferIn {
                asset_id: 1,
                account_id: account_b,
                fees: dec!(0),
                units: dec!(5),
                date: datetime!(2000-03-26 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let cash = |account: &Uuid| {
            portfolio
                .account_portfolios()
                .get(account)
                .expect("Should contain account")
                .cash_portfolios
                .get(&1)
                .expect("Should contain cash")
        };

        assert_eq!(cash(&account_a).units(), dec!(60));
        assert_eq!(cash(&account_a).fees(), dec!(0));
        assert_eq!(cash(&account_b).units(), dec!(64));
        assert_eq!(cash(&account_b).fees(), dec!(1));
    }

    #[test]
    fn balance_transfer_keeps_currencies_separate() {
        let mut portfolio = Portfolio::new();
        let account_a = Uuid::new_v4();
        let account_b = Uuid::new_v4();
        let eur = 1;
        let usd = 2;

        let input: Vec<Box<dyn PortfolioAction>> = vec![
            Box::new(CashTransferIn {
                asset_id: eur,
                account_id: account_a,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashTransferIn {
                asset_id: usd,
                account_id: account_a,
                fees: dec!(0),
                units: dec!(100),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashTransferIn {
                asset_id: usd,
                account_id: account_b,
                fees: dec!(0),
                units: dec!(70),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
            Box::new(CashBalanceTransfer {
                asset_id: eur,
                account_from: account_a,
                account_to: account_b,
                units: dec!(40),
                fees: dec!(0),
                date: datetime!(2000-03-23 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);

        let source = portfolio
            .account_portfolios()
            .get(&account_a)
            .expect("Should contain source account");
        let destination = portfolio
            .account_portfolios()
            .get(&account_b)
            .expect("Should contain destination account");

        assert_eq!(
            source.cash_portfolios.get(&eur).expect("EUR cash").units(),
            dec!(60)
        );
        assert_eq!(
            destination
                .cash_portfolios
                .get(&eur)
                .expect("EUR cash")
                .units(),
            dec!(40)
        );
        assert_eq!(
            source.cash_portfolios.get(&usd).expect("USD cash").units(),
            dec!(100)
        );
        assert_eq!(
            destination
                .cash_portfolios
                .get(&usd)
                .expect("USD cash")
                .units(),
            dec!(70)
        );
    }
}
