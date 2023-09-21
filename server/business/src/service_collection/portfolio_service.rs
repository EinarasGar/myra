use std::collections::HashMap;


use dal::db_sets::portfolio_db_set::{self};

use dal::models::portfolio_models::{PortfolioAccountIdNameModel, PortfolioCombined};
use dal::{database_context::MyraDb, models::portfolio_models::PortfolioAccountModel};
use rust_decimal::Decimal;
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::dtos::asset_rate_dto::AssetRateDto;
use crate::dtos::portfolio_account_dto::PortfolioAccountDto;
use crate::dtos::portfolio_dto::PortfolioDto;

use super::asset_service::AssetsService;
use super::transaction_service::TransactionService;
use super::Services;

#[derive(Clone)]
pub struct PortfolioService {
    db_context: MyraDb,
    transaction_service: TransactionService,
    asset_serice: AssetsService,
}

impl PortfolioService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            db_context: db.clone(),
            transaction_service: Services::get_transaction_service(db.clone()),
            asset_serice: Services::get_assets_service(db),
        }
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_full_portfolio_history(
        &self,
        user_id: Uuid,
        reference_asset: i32,
    ) -> anyhow::Result<Vec<AssetRateDto>> {
        let financials_pair = self
            .transaction_service
            .get_all_transaction_financials(user_id)
            .await?;

        let mut transactions_queue = financials_pair.0;
        let asset_ids = financials_pair.1;

        if transactions_queue.len() == 0 {
            return Ok(Vec::new());
        };

        let earliest_date = transactions_queue.front().unwrap().date;

        let mut asset_rate_queues = self
            .asset_serice
            .get_asset_rates_default_from_date(reference_asset, asset_ids, earliest_date)
            .await?;

        println!("{:?}", asset_rate_queues);

        let mut history: Vec<AssetRateDto> = Vec::new();
        let mut cumulative_sum: HashMap<i32, Decimal> = HashMap::new();
        let todays_date: OffsetDateTime = OffsetDateTime::now_utc();
        let mut last_rates: HashMap<i32, Decimal> = HashMap::new();
        asset_rate_queues
            .iter_mut()
            .for_each(|(asset_id, rate_queue)| {
                if asset_id.1 == reference_asset {
                    *last_rates.entry(asset_id.0).or_insert(Decimal::new(0, 0)) =
                        rate_queue.front().unwrap().rate;
                } else {
                    // if let Some(secondary_pair) =
                    //     asset_rate_queues.get(&(asset_id.1, reference_asset))
                    // {
                    //     *last_rates.entry(asset_id.0).or_insert(Decimal::new(0, 0)) *=
                    //         secondary_pair.front().unwrap().rate;
                    // }
                }
            });

        let mut iter_date: OffsetDateTime = earliest_date;
        while iter_date.le(&todays_date) {
            //Iterate over asset queue and read the assets that are before the the date
            loop {
                if transactions_queue
                    .front()
                    .is_some_and(|t| t.date <= iter_date)
                {
                    let trans = transactions_queue.pop_front().unwrap();
                    *cumulative_sum
                        .entry(trans.asset_id)
                        .or_insert(Decimal::new(0, 0)) += trans.quantity;
                    //If asset is added, try lookig at another asset
                    continue;
                }
                //If transactionsa are finished or no more assets are to be added, exit the loop
                break;
            }

            //Update last_rates to contain the latest rates to this iter date
            asset_rate_queues
                .iter_mut()
                .for_each(|(asset_id, rate_queue)| loop {
                    if rate_queue.front().is_some_and(|r| r.date <= iter_date) {
                        let rate = rate_queue.pop_front().unwrap();
                        *last_rates.entry(asset_id.0).or_insert(Decimal::new(0, 0)) = rate.rate;
                        if asset_id.1 != reference_asset {
                            let secondary_rate = last_rates.get(&asset_id.1).cloned();
                            if let Some(secondary_rate) = secondary_rate {
                                *last_rates.entry(asset_id.0).or_insert(Decimal::new(0, 0)) *=
                                    secondary_rate;
                            }
                        }
                        continue;
                    }
                    break;
                });

            let mut todays_sum: Decimal = Decimal::new(0, 0);
            cumulative_sum.iter().for_each(|(asset_id, sum)| {
                if *asset_id == reference_asset {
                    todays_sum += sum;
                    return;
                }

                if let Some(rate_now) = last_rates.get(asset_id) {
                    todays_sum += *sum * *rate_now;
                }
            });

            history.push(AssetRateDto {
                rate: todays_sum,
                date: iter_date,
            });

            println!(
                "{:?} {:?} {:?}", // {:?} {:?} {:?}",
                iter_date,
                cumulative_sum,
                last_rates //, cumulative_sum, entr, todays_sum
            );
            iter_date = iter_date.checked_add(Duration::hours(12)).unwrap();
        }

        //next order of business - smooth out rates + get the actual last value + make so we only fetch asset prices before
        // that asset earliest day + add currency conversions

        Ok(history)
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_portfolio(&self, user_id: Uuid) -> anyhow::Result<Vec<PortfolioDto>> {
        let (sql, values) = portfolio_db_set::get_portfolio_with_asset_account_info(user_id);

        let models = self
            .db_context
            .fetch_all::<PortfolioCombined>(sql, values)
            .await?;

        let ret_vec: Vec<PortfolioDto> = models.iter().map(|val| val.clone().into()).collect();
        Ok(ret_vec)
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn insert_or_update_portfolio_account(
        &self,
        user_id: Uuid,
        account: PortfolioAccountDto,
    ) -> anyhow::Result<PortfolioAccountDto> {
        let account_id = account.account_id.unwrap_or(Uuid::new_v4());
        let model = PortfolioAccountModel {
            id: account_id,
            user_id,
            name: account.account_name,
        };

        let (sql, values) = portfolio_db_set::insert_or_update_portfolio_account(model.clone());
        self.db_context.execute(sql, values).await?;

        Ok(model.into())
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_portfolio_accounts(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<PortfolioAccountDto>> {
        let (sql, values) = portfolio_db_set::get_portfolio_accounts_by_user_id(user_id);
        let models = self
            .db_context
            .fetch_all::<PortfolioAccountIdNameModel>(sql, values)
            .await?;

        let ret_models = models.iter().map(|val| val.clone().into()).collect();
        Ok(ret_models)
    }
}
