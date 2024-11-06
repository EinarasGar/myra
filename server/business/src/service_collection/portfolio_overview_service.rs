use std::vec;

#[mockall_double::double]
use dal::database_context::MyraDb;

use rust_decimal_macros::dec;
use time::macros::datetime;
use uuid::Uuid;

use crate::dtos::portfolio_overview_dto::PortfolioOverviewDto;
use crate::entities::portfolio_overview::investment_transaction::asset_purchase::AssetPurchase;
use crate::entities::portfolio_overview::investment_transaction::cash_transfer_in::CashTransferIn;
use crate::entities::portfolio_overview::portfolio::{Portfolio, PortfolioAction};

#[mockall_double::double]
use super::asset_service::AssetsService;
#[mockall_double::double]
use super::transaction_service::TransactionService;

pub struct PortfolioOverviewService {
    #[allow(dead_code)]
    db: MyraDb,
    _transaction_service: TransactionService,
    _asset_service: AssetsService,
}

impl PortfolioOverviewService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            db: db.clone(),
            _transaction_service: TransactionService::new(db.clone()),
            _asset_service: AssetsService::new(db.clone()),
        }
    }

    pub async fn get_full_portfolio_overview(&self) -> anyhow::Result<PortfolioOverviewDto> {
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
            Box::new(AssetPurchase {
                instrument_asset_id: 1,
                account_id,
                instrument_units: dec!(1),
                instrument_reference_price: dec!(1),
                fees: dec!(1),
                cash_asset_id: 10,
                cash_units: dec!(15),
                date: datetime!(2000-03-22 00:00:00 UTC),
            }),
        ];

        portfolio.process_transactions(input);
        Ok(portfolio.into())
    }

    // pub async fn get_portfolio_asset_overview(
    //     &self,
    //     user_id: Uuid,
    //     asset_id: i32,
    //     reference_asset_id: i32,
    // ) -> anyhow::Result<Vec<i32>> {
    //     unimplemented!()
    // let transactions = self
    //     .transaction_service
    //     .get_investment_transactions_with_links(user_id, Some(asset_id))
    //     .await?;

    // let mut data_for_asset_query: Vec<AssetIdDateDto> = Vec::new();
    // transactions.iter().for_each(|trans| {
    //     if trans.asset_id != reference_asset_id {
    //         data_for_asset_query.push(AssetIdDateDto {
    //             asset_id: trans.asset_id,
    //             date: trans.date,
    //         })
    //     }
    // });

    // let mut prices: VecDeque<Option<AssetPairRateDto>> = self
    //     .asset_service
    //     .get_asset_refrence_price_by_dates(data_for_asset_query, reference_asset_id)
    //     .await?
    //     .into_iter()
    //     .collect();

    // println!("{:#?}", prices);

    // let trans_with_prices: Vec<(Decimal, InvestmentDetailModel)> = transactions
    //     .into_iter()
    //     .map(|trans| {
    //         if trans.asset_id != reference_asset_id {
    //             if let Some(Some(price)) = prices.pop_front() {
    //                 (price.rate, trans)
    //             } else {
    //                 (dec!(0), trans)
    //             }
    //         } else {
    //             (dec!(1), trans)
    //         }
    //     })
    //     .collect();

    // println!("{:#?}", trans_with_prices);

    // //negerai bus nes jei assetas nera linke tai jis nebus reflectinamas

    // let mut grouped_results_full: HashMap<Uuid, Vec<(Decimal, InvestmentDetailModel)>> =
    //     HashMap::new();
    // trans_with_prices.into_iter().for_each(|model| {
    //     let entry = grouped_results_full
    //         .entry(model.1.link_id)
    //         .or_insert(Vec::new());
    //     entry.push(model);
    // });

    // //The fuck of a monstrosity did i write here
    // let asset_rate = self
    //     .asset_service
    //     .get_assets_rates_default_latest(
    //         vec![(asset_id, reference_asset_id)].into_iter().collect(),
    //     )
    //     .await?
    //     .into_iter()
    //     .next()
    //     .unwrap()
    //     .1
    //     .rate;

    // let mut ret: Vec<InvestmentRowDto> = vec![];
    // grouped_results_full.into_iter().for_each(|(link_id, v)| {
    //     let mut main_transaction: Option<InvestmentDetailModel> = None;
    //     //let mut price
    //     v.into_iter().for_each(|(rate, trans)| {
    //         if trans.asset_id == asset_id {
    //             main_transaction = Some(trans.clone());
    //         }
    //     });

    //     let main_transaction = main_transaction.unwrap();
    //     ret.push(InvestmentRowDto {
    //         action: if main_transaction.quantity < dec!(0) {
    //             InvestmentAction::Sell
    //         } else {
    //             InvestmentAction::Buy
    //         },
    //         date: main_transaction.date,
    //         units: main_transaction.quantity,
    //         fees: dec!(1),
    //         price: dec!(1),
    //     })
    // });
    // Ok(ret)
    // }
}
