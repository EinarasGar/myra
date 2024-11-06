#[mockall_double::double]
use dal::database_context::MyraDb;

use super::asset_service::AssetsService;
use super::transaction_service::TransactionService;

pub struct PortfolioService {
    _db_context: MyraDb,
    _transaction_service: TransactionService,
    _asset_serice: AssetsService,
}

impl PortfolioService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            _db_context: db.clone(),
            _transaction_service: TransactionService::new(db.clone()),
            _asset_serice: AssetsService::new(db),
        }
    }

    //     #[tracing::instrument(skip_all, err)]
    //     pub async fn get_full_portfolio_history(
    //         &self,
    //         user_id: Uuid,
    //         reference_asset: i32,
    //         interval: Duration,
    //     ) -> anyhow::Result<Vec<AssetRateDto>> {
    //         let financials_pair = self
    //             .transaction_service
    //             .get_all_transaction_financials(user_id)
    //             .await?;

    //         let transactions_queue = financials_pair.0;
    //         let asset_ids = financials_pair.1;

    //         if transactions_queue.is_empty() {
    //             return Ok(Vec::new());
    //         };

    //         let earliest_date = transactions_queue.front().unwrap().date;

    //         let asset_rate_queues = self
    //             .asset_serice
    //             .get_assets_rates_default_from_date(reference_asset, asset_ids, Some(earliest_date))
    //             .await?;

    //         let history = calculate_portfolio_history(
    //             transactions_queue,
    //             asset_rate_queues,
    //             reference_asset,
    //             earliest_date,
    //             OffsetDateTime::now_utc(),
    //             interval,
    //         );

    //         //next order of business - get the actual last value + make so we only fetch asset prices before
    //         // that asset earliest day + add currency conversions

    //         //THIS IS FOR TESTING PURPOSES ONLY
    //         let reduced: Vec<AssetRateDto> = history
    //             .into_iter()
    //             .filter(|x| x.date >= datetime!(2023-10-14 12:00:00 UTC))
    //             .collect();

    //         Ok(reduced)
    //     }

    //     #[tracing::instrument(skip_all, err)]
    //     pub async fn get_portfolio(
    //         &self,
    //         user_id: Uuid,
    //         reference_asset: i32,
    //     ) -> anyhow::Result<PortfolioDto> {
    //         let query = portfolio_queries::get_portfolio_with_asset_account_info(user_id);

    //         let models = self
    //             .db_context
    //             .fetch_all::<PortfolioCombined>(query)
    //             .await?;

    //         let mut rates_ids: HashSet<(i32, i32)> = HashSet::new();
    //         for model in &models {
    //             if model.base_pair_id.is_some() {
    //                 rates_ids.insert((model.asset_id, model.base_pair_id.unwrap()));
    //                 rates_ids.insert((model.base_pair_id.unwrap(), reference_asset));
    //             }
    //             rates_ids.insert((model.asset_id, reference_asset));
    //         }

    //         let asset_rates: HashMap<(i32, i32), AssetRateDto> = self
    //             .asset_serice
    //             .get_assets_rates_default_latest(rates_ids)
    //             .await?;

    //         let ref_asset = self.asset_serice.get_asset(reference_asset).await?;

    //         let sums_of_costs = self
    //             .transaction_service
    //             .get_sums_of_costs(user_id, reference_asset)
    //             .await?;

    //         let ret_rows: Vec<PortfolioRowDto> = models
    //             .into_iter()
    //             .map(|val| {
    //                 let mut last_rate: Option<AssetRateDto> = None;
    //                 let mut last_reference_rate: Option<AssetRateDto> = None;
    //                 if val.asset_id == reference_asset {
    //                     last_rate = Some(AssetRateDto {
    //                         rate: dec!(1),
    //                         date: OffsetDateTime::now_utc(),
    //                     });
    //                     last_reference_rate = last_rate.clone();
    //                 } else {
    //                     if val.base_pair_id.is_some() {
    //                         last_rate = asset_rates
    //                             .get(&(val.asset_id, val.base_pair_id.unwrap()))
    //                             .cloned();
    //                     }

    //                     if asset_rates.contains_key(&(val.asset_id, reference_asset)) {
    //                         last_reference_rate =
    //                             asset_rates.get(&(val.asset_id, reference_asset)).cloned();
    //                     } else if last_rate.is_some()
    //                         && asset_rates.contains_key(&(val.base_pair_id.unwrap(), reference_asset))
    //                     {
    //                         let ref_rate = asset_rates
    //                             .get(&(val.base_pair_id.unwrap(), reference_asset))
    //                             .cloned();

    //                         last_reference_rate = Some(AssetRateDto {
    //                             rate: last_rate.clone().unwrap().rate * ref_rate.unwrap().rate,
    //                             date: last_rate.clone().unwrap().date,
    //                         })
    //                     }
    //                 }

    //                 PortfolioRowDto {
    //                     asset: AssetDto {
    //                         ticker: val.ticker,
    //                         name: val.name,
    //                         category: val.category,
    //                         asset_id: val.asset_id,
    //                         owner: None,
    //                     },
    //                     base_asset: if val.base_pair_id.is_some()
    //                         && val.base_pair_name.is_some()
    //                         && val.base_pair_ticker.is_some()
    //                         && val.base_pair_category.is_some()
    //                     {
    //                         Some(AssetDto {
    //                             ticker: val.base_pair_ticker.unwrap(),
    //                             name: val.base_pair_name.unwrap(),
    //                             category: val.base_pair_category.unwrap(),
    //                             asset_id: val.base_pair_id.unwrap(),
    //                             owner: None,
    //                         })
    //                     } else {
    //                         None
    //                     },
    //                     account: PortfolioAccountDto {
    //                         account_id: Some(val.account_id),
    //                         account_name: val.account_name,
    //                     },
    //                     sum: val.sum,

    //                     last_rate,
    //                     last_reference_rate,
    //                     sum_of_cost: sums_of_costs.get(&(val.asset_id, val.account_id)).cloned(),
    //                 }
    //             })
    //             .collect();

    //         Ok(PortfolioDto {
    //             rows: ret_rows,
    //             reference_asset: ref_asset,
    //         })
    //     }

    //     #[tracing::instrument(skip_all, err)]
    //     pub async fn insert_or_update_portfolio_account(
    //         &self,
    //         user_id: Uuid,
    //         account: PortfolioAccountDto,
    //     ) -> anyhow::Result<PortfolioAccountDto> {
    //         let account_id = account.account_id.unwrap_or(Uuid::new_v4());
    //         let model = PortfolioAccountModel {
    //             id: account_id,
    //             user_id,
    //             name: account.account_name,
    //         };

    //         let query = portfolio_queries::insert_or_update_portfolio_account(model.clone());
    //         self.db_context.execute(query).await?;

    //         Ok(model.into())
    //     }

    //     #[tracing::instrument(skip_all, err)]
    //     pub async fn get_portfolio_accounts(
    //         &self,
    //         user_id: Uuid,
    //     ) -> anyhow::Result<Vec<PortfolioAccountDto>> {
    //         let query = portfolio_queries::get_portfolio_accounts_by_user_id(user_id);
    //         let models = self
    //             .db_context
    //             .fetch_all::<PortfolioAccountIdNameModel>(query)
    //             .await?;

    //         let ret_models = models.iter().map(|val| val.clone().into()).collect();
    //         Ok(ret_models)
    //     }

    //     pub async fn update_portfolio(
    //         &self,
    //         update_entries: Vec<PortfolioUpdateDto>,
    //     ) -> anyhow::Result<()> {
    //         let portfolio_updates = update_entries.into_iter().map(|val| val.into()).collect();
    //         let query = portfolio_queries::update_portfolio(portfolio_updates);
    //         self.db_context.execute(query).await?;
    //         Ok(())
    //     }
    // }

    // #[tracing::instrument(skip_all)]
    // fn calculate_portfolio_history(
    //     mut transactions_queue: VecDeque<TransactionFinancialsDto>,
    //     mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>>,
    //     reference_asset: i32,
    //     start_time: OffsetDateTime,
    //     end_time: OffsetDateTime,
    //     interval: Duration,
    // ) -> Vec<AssetRateDto> {
    //     let mut history: Vec<AssetRateDto> = Vec::new();
    //     let mut cumulative_sum: HashMap<i32, Decimal> = HashMap::new();
    //     let mut last_rates: HashMap<(i32, i32), AssetRateDto> = HashMap::new();

    //     asset_rate_queues.iter().for_each(|(asset_id, rate_queue)| {
    //         *last_rates
    //             .entry(*asset_id)
    //             .or_insert(AssetRateDto::default()) = rate_queue.front().unwrap().clone();
    //     });

    //     update_rates_with_base_rate(&asset_rate_queues, reference_asset, &mut last_rates);

    //     let mut iter_date: OffsetDateTime = start_time;
    //     while iter_date <= end_time {
    //         //Iterate over asset queue and read the assets that are before the the date
    //         update_cumulative_asset_sum_for_today(
    //             &mut transactions_queue,
    //             iter_date,
    //             &mut cumulative_sum,
    //         );

    //         //First calculate all latest asset rates
    //         update_rates_for_new_tiemstamp(&mut asset_rate_queues, &mut last_rates, iter_date);
    //         update_rates_interpolation(&asset_rate_queues, &mut last_rates, iter_date, interval);
    //         update_rates_with_base_rate(&asset_rate_queues, reference_asset, &mut last_rates);
    //         let todays_sum = get_todays_sum(&cumulative_sum, &last_rates, reference_asset);

    //         history.push(AssetRateDto {
    //             rate: todays_sum,
    //             date: iter_date,
    //         });

    //         if iter_date == end_time {
    //             break;
    //         } else if iter_date + interval > end_time {
    //             iter_date = min(iter_date + interval, end_time);
    //         } else {
    //             iter_date += interval;
    //         }
    //     }
    //     history
    // }

    // fn update_rates_with_base_rate(
    //     asset_rate_queues: &HashMap<(i32, i32), VecDeque<AssetRateDto>>,
    //     reference_asset: i32,
    //     last_rates: &mut HashMap<(i32, i32), AssetRateDto>,
    // ) {
    //     //Update any non reference rates with a base rate
    //     asset_rate_queues.iter().for_each(|(asset_id_pair, _)| {
    //         if asset_id_pair.1 != reference_asset {
    //             let primary_rate = last_rates.get(asset_id_pair);
    //             let secondary_rate = last_rates.get(&(asset_id_pair.1, reference_asset));
    //             if let (Some(secondary_rate), Some(primary_rate)) = (secondary_rate, primary_rate) {
    //                 *last_rates
    //                     .entry((asset_id_pair.0, reference_asset))
    //                     .or_insert(AssetRateDto::default()) = AssetRateDto {
    //                     date: primary_rate.date,
    //                     rate: primary_rate.rate * secondary_rate.rate,
    //                 }
    //             }
    //         }
    //     });
    // }

    // fn update_rates_interpolation(
    //     asset_rate_queues: &HashMap<(i32, i32), VecDeque<AssetRateDto>>,
    //     last_rates: &mut HashMap<(i32, i32), AssetRateDto>,
    //     current_timestamp: OffsetDateTime,
    //     interval: Duration,
    // ) {
    //     asset_rate_queues
    //         .iter()
    //         .for_each(|(asset_id_pair, rate_queue)| {
    //             let latest_rate = last_rates.get(asset_id_pair);
    //             if let Some(latest_rate) = latest_rate {
    //                 // Check if latest date was not updated in this loop
    //                 if latest_rate.date + interval <= current_timestamp {
    //                     let next_rate = rate_queue.front();
    //                     if let Some(next_rate) = next_rate {
    //                         let last_timestamp = Decimal::from_i64(latest_rate.date.unix_timestamp());
    //                         let next_timestamp = Decimal::from_i64(next_rate.date.unix_timestamp());
    //                         let now_timestamp = Decimal::from_i64(current_timestamp.unix_timestamp());

    //                         if let (Some(last_timestamp), Some(next_timestamp), Some(now_timestamp)) =
    //                             (last_timestamp, next_timestamp, now_timestamp)
    //                         {
    //                             let interpolated_rate = (next_rate.rate - latest_rate.rate)
    //                                 * (now_timestamp - last_timestamp)
    //                                 / (next_timestamp - last_timestamp)
    //                                 + latest_rate.rate;

    //                             *last_rates
    //                                 .entry(*asset_id_pair)
    //                                 .or_insert(AssetRateDto::default()) = AssetRateDto {
    //                                 date: current_timestamp,
    //                                 rate: interpolated_rate,
    //                             }
    //                         }
    //                     }
    //                 }
    //             }
    //         });
}

// fn update_rates_for_new_tiemstamp(
//     asset_rate_queues: &mut HashMap<(i32, i32), VecDeque<AssetRateDto>>,
//     last_rates: &mut HashMap<(i32, i32), AssetRateDto>,
//     current_timestamp: OffsetDateTime,
// ) {
//     asset_rate_queues
//         .iter_mut()
//         .for_each(|(asset_id, rate_queue)| loop {
//             if rate_queue
//                 .front()
//                 .is_some_and(|r| r.date <= current_timestamp)
//             {
//                 let rate = rate_queue.pop_front().unwrap();
//                 *last_rates
//                     .entry(*asset_id)
//                     .or_insert(AssetRateDto::default()) = rate;
//                 continue;
//             }
//             break;
//         });
// }

// fn get_todays_sum(
//     cumulative_sum: &HashMap<i32, Decimal>,
//     last_rates: &HashMap<(i32, i32), AssetRateDto>,
//     reference_asset: i32,
// ) -> Decimal {
//     let mut todays_sum: Decimal = Decimal::new(0, 0);
//     cumulative_sum.iter().for_each(|(asset_id, sum)| {
//         if *asset_id == reference_asset {
//             todays_sum += sum;
//             return;
//         }

//         if let Some(latest_rate) = last_rates.get(&(*asset_id, reference_asset)) {
//             todays_sum += *sum * latest_rate.rate;
//         }
//     });
//     todays_sum
// }

// fn update_cumulative_asset_sum_for_today(
//     transactions_queue: &mut VecDeque<TransactionFinancialsDto>,
//     current_timestamp: OffsetDateTime,
//     cumulative_sum: &mut HashMap<i32, Decimal>,
// ) {
//     loop {
//         if transactions_queue
//             .front()
//             .is_some_and(|t| t.date <= current_timestamp)
//         {
//             let trans = transactions_queue.pop_front().unwrap();
//             *cumulative_sum
//                 .entry(trans.asset_id)
//                 .or_insert(Decimal::new(0, 0)) += trans.quantity;
//             //If asset is added, try lookig at another asset
//             continue;
//         }
//         //If transactionsa are finished or no more assets are to be added, exit the loop
//         break;
//     }
// }

// #[cfg(test)]
// mod tests {
//     use super::*;
//     use rust_decimal_macros::dec;
//     use time::macros::datetime;

//     #[test]
//     fn test_calculate_portfolio_hisotry_intervals() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 11:59:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![AssetRateDto {
//                 rate: dec!(1),
//                 date: datetime!(2023-03-22 11:59:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 11:59:00 UTC),
//             datetime!(2023-03-22 14:58:00 UTC),
//             Duration::hours(1),
//         );

//         assert_eq!(result.len(), 4);
//         assert_eq!(result[0].date, datetime!(2023-03-22 11:59:00 UTC));
//         assert_eq!(result[1].date, datetime!(2023-03-22 12:59:00 UTC));
//         assert_eq!(result[2].date, datetime!(2023-03-22 13:59:00 UTC));
//         assert_eq!(result[3].date, datetime!(2023-03-22 14:58:00 UTC));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_old_asset_date() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![AssetRateDto {
//                 rate: dec!(1.5),
//                 date: datetime!(2023-03-22 11:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 13:00:00 UTC),
//             Duration::hours(1),
//         );

//         assert_eq!(result.len(), 2);
//         assert_eq!(result[0].rate, dec!(1.5));
//         assert_eq!(result[1].rate, dec!(1.5));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_old_asset_date_with_base() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![AssetRateDto {
//                 rate: dec!(2),
//                 date: datetime!(2023-03-22 11:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );
//         asset_rate_queues.insert(
//             (2, 3),
//             vec![AssetRateDto {
//                 rate: dec!(3),
//                 date: datetime!(2023-03-22 11:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             3,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 13:00:00 UTC),
//             Duration::hours(1),
//         );

//         assert_eq!(result.len(), 2);
//         assert_eq!(result[0].rate, dec!(6));
//         assert_eq!(result[1].rate, dec!(6));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_later_asset_date() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![AssetRateDto {
//                 rate: dec!(1.5),
//                 date: datetime!(2023-03-22 13:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 14:00:00 UTC),
//             Duration::hours(1),
//         );

//         assert_eq!(result.len(), 3);
//         assert_eq!(result[0].rate, dec!(1.5));
//         assert_eq!(result[1].rate, dec!(1.5));
//         assert_eq!(result[2].rate, dec!(1.5));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_later_asset_date_with_base() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![AssetRateDto {
//                 rate: dec!(2),
//                 date: datetime!(2023-03-22 13:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );
//         asset_rate_queues.insert(
//             (2, 3),
//             vec![AssetRateDto {
//                 rate: dec!(3),
//                 date: datetime!(2023-03-22 13:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             3,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 14:00:00 UTC),
//             Duration::hours(1),
//         );

//         assert_eq!(result.len(), 3);
//         assert_eq!(result[0].rate, dec!(6));
//         assert_eq!(result[1].rate, dec!(6));
//         assert_eq!(result[2].rate, dec!(6));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_empty() {
//         let transactions_queue = vec![];
//         let asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 13:00:00 UTC),
//             Duration::hours(1),
//         );
//         assert_eq!(result.len(), 2);
//         assert_eq!(result[0].rate, dec!(0));
//         assert_eq!(result[1].rate, dec!(0));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_zero_trans() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(0),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(2),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(3),
//                     date: datetime!(2023-03-22 13:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 13:00:00 UTC),
//             Duration::hours(1),
//         );
//         assert_eq!(result.len(), 2);
//         assert_eq!(result[0].rate, dec!(0));
//         assert_eq!(result[1].rate, dec!(0));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_zero_asset() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(123),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![AssetRateDto {
//                 rate: dec!(0),
//                 date: datetime!(2023-03-22 12:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 13:00:00 UTC),
//             Duration::hours(1),
//         );
//         assert_eq!(result.len(), 2);
//         assert_eq!(result[0].rate, dec!(0));
//         assert_eq!(result[1].rate, dec!(0));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_le_1_interval() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(2),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(3),
//                     date: datetime!(2023-03-22 13:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 12:30:00 UTC),
//             Duration::hours(1),
//         );
//         assert_eq!(result.len(), 2);
//         assert_eq!(result[0].rate, dec!(2));
//         assert_eq!(result[1].rate, dec!(2));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_1_interval() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(2),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(3),
//                     date: datetime!(2023-03-22 13:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 13:00:00 UTC),
//             Duration::hours(1),
//         );
//         assert_eq!(result.len(), 2);
//         assert_eq!(result[0].rate, dec!(2));
//         assert_eq!(result[1].rate, dec!(3));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_0_intervals() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![AssetRateDto {
//                 rate: dec!(2),
//                 date: datetime!(2023-03-22 12:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 12:00:00 UTC),
//             Duration::hours(1),
//         );
//         assert_eq!(result.len(), 1);
//         assert_eq!(result[0].rate, dec!(2));
//         assert_eq!(result[0].date, datetime!(2023-03-22 12:00:00 UTC));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_multi_trans_same_asset() {
//         let transactions_queue = vec![
//             TransactionFinancialsDto {
//                 account_id: Uuid::new_v4(),
//                 asset_id: 1,
//                 quantity: dec!(1),
//                 date: datetime!(2023-03-22 12:00:00 UTC),
//             },
//             TransactionFinancialsDto {
//                 account_id: Uuid::new_v4(),
//                 asset_id: 1,
//                 quantity: dec!(2),
//                 date: datetime!(2023-03-22 13:00:00 UTC),
//             },
//         ];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(2),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(3),
//                     date: datetime!(2023-03-22 13:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 14:00:00 UTC),
//             Duration::hours(1),
//         );

//         assert_eq!(result.len(), 3);
//         assert_eq!(result[0].rate, dec!(2));
//         assert_eq!(result[1].rate, dec!(9));
//         assert_eq!(result[2].rate, dec!(9));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_1_each_trans_multi_asset() {
//         let transactions_queue = vec![
//             TransactionFinancialsDto {
//                 account_id: Uuid::new_v4(),
//                 asset_id: 1,
//                 quantity: dec!(1),
//                 date: datetime!(2023-03-22 12:00:00 UTC),
//             },
//             TransactionFinancialsDto {
//                 account_id: Uuid::new_v4(),
//                 asset_id: 3,
//                 quantity: dec!(2),
//                 date: datetime!(2023-03-22 12:00:00 UTC),
//             },
//         ];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![AssetRateDto {
//                 rate: dec!(2),
//                 date: datetime!(2023-03-22 12:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );

//         asset_rate_queues.insert(
//             (3, 2),
//             vec![AssetRateDto {
//                 rate: dec!(3),
//                 date: datetime!(2023-03-22 12:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 13:00:00 UTC),
//             Duration::hours(1),
//         );

//         assert_eq!(result.len(), 2);
//         assert_eq!(result[0].rate, dec!(8));
//         assert_eq!(result[1].rate, dec!(8));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_multi_trans_multi_asset() {
//         let transactions_queue = vec![
//             TransactionFinancialsDto {
//                 account_id: Uuid::new_v4(),
//                 asset_id: 1,
//                 quantity: dec!(1),
//                 date: datetime!(2023-03-22 12:00:00 UTC),
//             },
//             TransactionFinancialsDto {
//                 account_id: Uuid::new_v4(),
//                 asset_id: 3,
//                 quantity: dec!(2),
//                 date: datetime!(2023-03-22 13:00:00 UTC),
//             },
//             TransactionFinancialsDto {
//                 account_id: Uuid::new_v4(),
//                 asset_id: 1,
//                 quantity: dec!(3),
//                 date: datetime!(2023-03-22 14:00:00 UTC),
//             },
//             TransactionFinancialsDto {
//                 account_id: Uuid::new_v4(),
//                 asset_id: 3,
//                 quantity: dec!(4),
//                 date: datetime!(2023-03-22 15:00:00 UTC),
//             },
//         ];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(1),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(2),
//                     date: datetime!(2023-03-22 13:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(3),
//                     date: datetime!(2023-03-22 14:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(4),
//                     date: datetime!(2023-03-22 15:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         asset_rate_queues.insert(
//             (3, 2),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(5),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(6),
//                     date: datetime!(2023-03-22 13:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(7),
//                     date: datetime!(2023-03-22 14:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(8),
//                     date: datetime!(2023-03-22 15:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 15:00:00 UTC),
//             Duration::hours(1),
//         );

//         assert_eq!(result.len(), 4);
//         assert_eq!(result[0].rate, dec!(1));
//         assert_eq!(result[1].rate, dec!(14));
//         assert_eq!(result[2].rate, dec!(26));
//         assert_eq!(result[3].rate, dec!(64));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_multi_trans_multi_asset_with_base() {
//         let transactions_queue = vec![
//             TransactionFinancialsDto {
//                 account_id: Uuid::new_v4(),
//                 asset_id: 1,
//                 quantity: dec!(1),
//                 date: datetime!(2023-03-22 12:00:00 UTC),
//             },
//             TransactionFinancialsDto {
//                 account_id: Uuid::new_v4(),
//                 asset_id: 3,
//                 quantity: dec!(2),
//                 date: datetime!(2023-03-22 13:00:00 UTC),
//             },
//             TransactionFinancialsDto {
//                 account_id: Uuid::new_v4(),
//                 asset_id: 4,
//                 quantity: dec!(3),
//                 date: datetime!(2023-03-22 14:00:00 UTC),
//             },
//         ];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 3),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(1),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(2),
//                     date: datetime!(2023-03-22 13:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(3),
//                     date: datetime!(2023-03-22 14:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(4),
//                     date: datetime!(2023-03-22 15:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         asset_rate_queues.insert(
//             (3, 2),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(5),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(6),
//                     date: datetime!(2023-03-22 13:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(7),
//                     date: datetime!(2023-03-22 14:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(8),
//                     date: datetime!(2023-03-22 15:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         asset_rate_queues.insert(
//             (4, 2),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(9),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(10),
//                     date: datetime!(2023-03-22 13:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(11),
//                     date: datetime!(2023-03-22 14:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(12),
//                     date: datetime!(2023-03-22 15:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 15:00:00 UTC),
//             Duration::hours(1),
//         );

//         assert_eq!(result.len(), 4);
//         assert_eq!(result[0].rate, dec!(5));
//         assert_eq!(result[1].rate, dec!(24));
//         assert_eq!(result[2].rate, dec!(68));
//         assert_eq!(result[3].rate, dec!(84));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_base_conversion_order() {
//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         for i in 0..100 {
//             asset_rate_queues.insert(
//                 (i, 999),
//                 vec![
//                     AssetRateDto {
//                         rate: dec!(3),
//                         date: datetime!(2023-03-22 11:00:00 UTC),
//                     },
//                     AssetRateDto {
//                         rate: dec!(4),
//                         date: datetime!(2023-03-22 12:00:00 UTC),
//                     },
//                 ]
//                 .into_iter()
//                 .collect(),
//             );
//         }

//         let top_of_the_list = asset_rate_queues.iter().last().unwrap().0.to_owned();
//         asset_rate_queues.insert(
//             (888, top_of_the_list.0),
//             vec![AssetRateDto {
//                 rate: dec!(2),
//                 date: datetime!(2023-03-22 12:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );

//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 888,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             999,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 12:00:00 UTC),
//             Duration::hours(1),
//         );

//         assert_eq!(result.len(), 1);
//         assert_eq!(result[0].rate, dec!(8));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_rate_updates_but_base_doesnt() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 3),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(1),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(2),
//                     date: datetime!(2023-03-22 13:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(3),
//                     date: datetime!(2023-03-22 14:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(4),
//                     date: datetime!(2023-03-22 15:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         asset_rate_queues.insert(
//             (3, 2),
//             vec![AssetRateDto {
//                 rate: dec!(2),
//                 date: datetime!(2023-03-22 12:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 15:00:00 UTC),
//             Duration::hours(1),
//         );

//         assert_eq!(result.len(), 4);
//         assert_eq!(result[0].rate, dec!(2));
//         assert_eq!(result[1].rate, dec!(4));
//         assert_eq!(result[2].rate, dec!(6));
//         assert_eq!(result[3].rate, dec!(8));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_base_updates_but_rate_doesnt() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 3),
//             vec![AssetRateDto {
//                 rate: dec!(2),
//                 date: datetime!(2023-03-22 12:00:00 UTC),
//             }]
//             .into_iter()
//             .collect(),
//         );

//         asset_rate_queues.insert(
//             (3, 2),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(1),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(2),
//                     date: datetime!(2023-03-22 13:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(3),
//                     date: datetime!(2023-03-22 14:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(4),
//                     date: datetime!(2023-03-22 15:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 15:00:00 UTC),
//             Duration::hours(1),
//         );

//         assert_eq!(result.len(), 4);
//         assert_eq!(result[0].rate, dec!(2));
//         assert_eq!(result[1].rate, dec!(4));
//         assert_eq!(result[2].rate, dec!(6));
//         assert_eq!(result[3].rate, dec!(8));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_interpolation() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 2),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(1),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(4),
//                     date: datetime!(2023-03-22 15:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(1),
//                     date: datetime!(2023-03-22 18:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 18:00:00 UTC),
//             Duration::hours(1),
//         );
//         assert_eq!(result.len(), 7);
//         assert_eq!(result[0].rate, dec!(1));
//         assert_eq!(result[1].rate, dec!(2));
//         assert_eq!(result[2].rate, dec!(3));
//         assert_eq!(result[3].rate, dec!(4));
//         assert_eq!(result[4].rate, dec!(3));
//         assert_eq!(result[5].rate, dec!(2));
//         assert_eq!(result[6].rate, dec!(1));
//     }

//     #[test]
//     fn test_calculate_portfolio_hisotry_interpolation_with_base() {
//         let transactions_queue = vec![TransactionFinancialsDto {
//             account_id: Uuid::new_v4(),
//             asset_id: 1,
//             quantity: dec!(1),
//             date: datetime!(2023-03-22 12:00:00 UTC),
//         }];

//         let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
//         asset_rate_queues.insert(
//             (1, 3),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(1),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(4),
//                     date: datetime!(2023-03-22 15:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(1),
//                     date: datetime!(2023-03-22 18:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         asset_rate_queues.insert(
//             (3, 2),
//             vec![
//                 AssetRateDto {
//                     rate: dec!(1),
//                     date: datetime!(2023-03-22 12:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(4),
//                     date: datetime!(2023-03-22 15:00:00 UTC),
//                 },
//                 AssetRateDto {
//                     rate: dec!(1),
//                     date: datetime!(2023-03-22 18:00:00 UTC),
//                 },
//             ]
//             .into_iter()
//             .collect(),
//         );

//         let result = calculate_portfolio_history(
//             transactions_queue.into_iter().collect(),
//             asset_rate_queues,
//             2,
//             datetime!(2023-03-22 12:00:00 UTC),
//             datetime!(2023-03-22 18:00:00 UTC),
//             Duration::hours(1),
//         );
//         assert_eq!(result.len(), 7);
//         assert_eq!(result[0].rate, dec!(1));
//         assert_eq!(result[1].rate, dec!(4));
//         assert_eq!(result[2].rate, dec!(9));
//         assert_eq!(result[3].rate, dec!(16));
//         assert_eq!(result[4].rate, dec!(9));
//         assert_eq!(result[5].rate, dec!(4));
//         assert_eq!(result[6].rate, dec!(1));
//     }
// }
