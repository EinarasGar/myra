use std::{
    cmp::min,
    collections::{HashMap, VecDeque},
};

use rust_decimal::{prelude::FromPrimitive, Decimal};
use time::{Duration, OffsetDateTime};

use crate::{
    dtos::{
        asset_rate_dto::AssetRateDto,
        assets::{asset_id_dto::AssetIdDto, asset_pair_ids_dto::AssetPairIdsDto},
        net_worth::entries_interval_sum_dto::EntriesIntervalSumDto,
    },
    entities::range::Range,
};

pub struct NetWorthHistory {
    reference_asset_id: AssetIdDto,
    interval: Duration,

    start_time: OffsetDateTime,
    end_time: OffsetDateTime,

    asset_first_occurances: HashMap<AssetIdDto, OffsetDateTime>,

    entries_queue: VecDeque<EntriesIntervalSumDto>,
    asset_pair_rates: HashMap<(i32, i32), VecDeque<AssetRateDto>>,

    last_rates: HashMap<(i32, i32), AssetRateDto>,
    cumulative_sum: HashMap<i32, Decimal>,
}

impl NetWorthHistory {
    pub fn new(reference_asset_id: AssetIdDto, range: Range) -> Self {
        Self {
            start_time: range.start_time(),
            end_time: range.end_time(),
            reference_asset_id,
            interval: range.interval(),
            asset_first_occurances: HashMap::new(),
            asset_pair_rates: HashMap::default(),
            entries_queue: VecDeque::default(),
            last_rates: HashMap::default(),
            cumulative_sum: HashMap::default(),
        }
    }

    /// Method takes in a list of entries and adds them to the net worth history calculation.
    ///
    /// Arguments
    ///
    /// * `entries`: Iterator containing sum of entries for a specific asset over a specific time interval.
    /// This method assumes that the entries are sorted by time from oldest to newest.
    pub fn add_entries(&mut self, entries: impl Iterator<Item = EntriesIntervalSumDto>) {
        entries.for_each(|e| {
            self.asset_first_occurances
                .entry(AssetIdDto(e.asset_id))
                .or_insert(e.time);

            self.entries_queue.push_back(e);
        });
    }

    pub fn entries_exist(&self) -> bool {
        !self.entries_queue.is_empty()
    }

    pub fn add_asset_rates(
        &mut self,
        asset_rates: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>>,
    ) {
        self.asset_pair_rates = asset_rates
            .into_iter()
            .map(|(k, v)| ((k.pair1.0, k.pair2.0), v))
            .collect();
    }

    pub fn get_asset_first_occurance_dates(&self) -> HashMap<AssetIdDto, OffsetDateTime> {
        self.asset_first_occurances.clone()
    }

    #[tracing::instrument(skip_all)]
    pub fn calculate_networth_history(&mut self) -> Vec<AssetRateDto> {
        let mut history: Vec<AssetRateDto> = Vec::new();

        self.asset_pair_rates
            .iter()
            .for_each(|(asset_id, rate_queue)| {
                *self
                    .last_rates
                    .entry(*asset_id)
                    .or_insert(AssetRateDto::default()) = rate_queue.front().unwrap().clone();
            });

        self.update_rates_with_base_rate();

        let mut iter_date: OffsetDateTime = self.start_time;
        while iter_date <= self.end_time {
            self.update_cumulative_asset_sum_for_today(iter_date);
            self.update_rates_for_new_tiemstamp(iter_date);
            self.update_rates_interpolation(iter_date);
            self.update_rates_with_base_rate();

            history.push(AssetRateDto {
                rate: self.get_todays_sum(),
                date: iter_date,
            });

            if iter_date == self.end_time {
                break;
            } else if iter_date + self.interval > self.end_time {
                iter_date = min(iter_date + self.interval, self.end_time);
            } else {
                iter_date += self.interval;
            }
        }
        history
    }

    fn update_rates_with_base_rate(&mut self) {
        //Update any non reference rates with a base rate
        self.asset_pair_rates.iter().for_each(|(asset_id_pair, _)| {
            if asset_id_pair.1 != self.reference_asset_id.0 {
                let primary_rate = self.last_rates.get(asset_id_pair);
                let secondary_rate = self
                    .last_rates
                    .get(&(asset_id_pair.1, self.reference_asset_id.0));
                if let (Some(secondary_rate), Some(primary_rate)) = (secondary_rate, primary_rate) {
                    *self
                        .last_rates
                        .entry((asset_id_pair.0, self.reference_asset_id.0))
                        .or_insert(AssetRateDto::default()) = AssetRateDto {
                        date: primary_rate.date,
                        rate: primary_rate.rate * secondary_rate.rate,
                    }
                }
            }
        });
    }

    fn update_cumulative_asset_sum_for_today(&mut self, current_timestamp: OffsetDateTime) {
        loop {
            if self
                .entries_queue
                .front()
                .is_some_and(|t| t.time <= current_timestamp)
            {
                let trans = self.entries_queue.pop_front().unwrap();
                *self
                    .cumulative_sum
                    .entry(trans.asset_id)
                    .or_insert(Decimal::new(0, 0)) += trans.quantity;
                //If asset is added, try lookig at another asset
                continue;
            }
            //If transactionsa are finished or no more assets are to be added, exit the loop
            break;
        }
    }

    fn update_rates_for_new_tiemstamp(&mut self, current_timestamp: OffsetDateTime) {
        self.asset_pair_rates
            .iter_mut()
            .for_each(|(asset_id, rate_queue)| loop {
                if rate_queue
                    .front()
                    .is_some_and(|r| r.date <= current_timestamp)
                {
                    let rate = rate_queue.pop_front().unwrap();
                    *self
                        .last_rates
                        .entry(*asset_id)
                        .or_insert(AssetRateDto::default()) = rate;
                    continue;
                }
                break;
            });
    }

    fn update_rates_interpolation(&mut self, current_timestamp: OffsetDateTime) {
        self.asset_pair_rates
            .iter()
            .for_each(|(asset_id_pair, rate_queue)| {
                let latest_rate = self.last_rates.get(asset_id_pair);
                if let Some(latest_rate) = latest_rate {
                    // Check if latest date was not updated in this loop
                    if latest_rate.date + self.interval <= current_timestamp {
                        let next_rate = rate_queue.front();
                        if let Some(next_rate) = next_rate {
                            let last_timestamp =
                                Decimal::from_i64(latest_rate.date.unix_timestamp());
                            let next_timestamp = Decimal::from_i64(next_rate.date.unix_timestamp());
                            let now_timestamp =
                                Decimal::from_i64(current_timestamp.unix_timestamp());

                            if let (
                                Some(last_timestamp),
                                Some(next_timestamp),
                                Some(now_timestamp),
                            ) = (last_timestamp, next_timestamp, now_timestamp)
                            {
                                let interpolated_rate = (next_rate.rate - latest_rate.rate)
                                    * (now_timestamp - last_timestamp)
                                    / (next_timestamp - last_timestamp)
                                    + latest_rate.rate;

                                *self
                                    .last_rates
                                    .entry(*asset_id_pair)
                                    .or_insert(AssetRateDto::default()) = AssetRateDto {
                                    date: current_timestamp,
                                    rate: interpolated_rate,
                                }
                            }
                        }
                    }
                }
            });
    }

    fn get_todays_sum(&mut self) -> Decimal {
        let mut todays_sum: Decimal = Decimal::new(0, 0);
        self.cumulative_sum.iter().for_each(|(asset_id, sum)| {
            if *asset_id == self.reference_asset_id.0 {
                todays_sum += sum;
                return;
            }

            if let Some(latest_rate) = self.last_rates.get(&(*asset_id, self.reference_asset_id.0))
            {
                todays_sum += *sum * latest_rate.rate;
            }
        });
        todays_sum
    }
}

#[cfg(test)]
mod tests {
    use crate::dtos::net_worth::range_dto::RangeDto;

    use super::*;
    use rust_decimal_macros::dec;
    use time::macros::datetime;

    #[test]
    fn test_calculate_portfolio_hisotry_intervals() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(1),
            time: datetime!(2023-03-22 11:59:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![AssetRateDto {
                rate: dec!(1),
                date: datetime!(2023-03-22 11:59:00 UTC),
            }]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 11:59:00 UTC)),
                Some(datetime!(2023-03-22 14:58:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();

        assert_eq!(result.len(), 4);
        assert_eq!(result[0].date, datetime!(2023-03-22 11:59:00 UTC));
        assert_eq!(result[1].date, datetime!(2023-03-22 12:59:00 UTC));
        assert_eq!(result[2].date, datetime!(2023-03-22 13:59:00 UTC));
        assert_eq!(result[3].date, datetime!(2023-03-22 14:58:00 UTC));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_old_asset_date() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(1),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![AssetRateDto {
                rate: dec!(1.5),
                date: datetime!(2023-03-22 11:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 13:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();

        assert_eq!(result.len(), 2);
        assert_eq!(result[0].rate, dec!(1.5));
        assert_eq!(result[1].rate, dec!(1.5));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_old_asset_date_with_base() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(1),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![AssetRateDto {
                rate: dec!(2),
                date: datetime!(2023-03-22 11:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );
        asset_rate_queues.insert(
            (2, 3),
            vec![AssetRateDto {
                rate: dec!(3),
                date: datetime!(2023-03-22 11:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(3),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 13:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();

        assert_eq!(result.len(), 2);
        assert_eq!(result[0].rate, dec!(6));
        assert_eq!(result[1].rate, dec!(6));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_later_asset_date() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(1),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![AssetRateDto {
                rate: dec!(1.5),
                date: datetime!(2023-03-22 13:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 14:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();

        assert_eq!(result.len(), 3);
        assert_eq!(result[0].rate, dec!(1.5));
        assert_eq!(result[1].rate, dec!(1.5));
        assert_eq!(result[2].rate, dec!(1.5));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_later_asset_date_with_base() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(1),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![AssetRateDto {
                rate: dec!(2),
                date: datetime!(2023-03-22 13:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );
        asset_rate_queues.insert(
            (2, 3),
            vec![AssetRateDto {
                rate: dec!(3),
                date: datetime!(2023-03-22 13:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(3),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 14:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();

        assert_eq!(result.len(), 3);
        assert_eq!(result[0].rate, dec!(6));
        assert_eq!(result[1].rate, dec!(6));
        assert_eq!(result[2].rate, dec!(6));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_empty() {
        let transactions_queue = vec![];
        let asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 13:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].rate, dec!(0));
        assert_eq!(result[1].rate, dec!(0));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_zero_trans() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(0),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![
                AssetRateDto {
                    rate: dec!(2),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(3),
                    date: datetime!(2023-03-22 13:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 13:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].rate, dec!(0));
        assert_eq!(result[1].rate, dec!(0));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_zero_asset() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(123),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![AssetRateDto {
                rate: dec!(0),
                date: datetime!(2023-03-22 12:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 13:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].rate, dec!(0));
        assert_eq!(result[1].rate, dec!(0));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_le_1_interval() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(1),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![
                AssetRateDto {
                    rate: dec!(2),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(3),
                    date: datetime!(2023-03-22 13:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 12:30:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].rate, dec!(2));
        assert_eq!(result[1].rate, dec!(2));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_1_interval() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(1),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![
                AssetRateDto {
                    rate: dec!(2),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(3),
                    date: datetime!(2023-03-22 13:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 13:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].rate, dec!(2));
        assert_eq!(result[1].rate, dec!(3));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_0_intervals() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(1),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![AssetRateDto {
                rate: dec!(2),
                date: datetime!(2023-03-22 12:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].rate, dec!(2));
        assert_eq!(result[0].date, datetime!(2023-03-22 12:00:00 UTC));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_multi_trans_same_asset() {
        let transactions_queue = vec![
            EntriesIntervalSumDto {
                asset_id: 1,
                quantity: dec!(1),
                time: datetime!(2023-03-22 12:00:00 UTC),
            },
            EntriesIntervalSumDto {
                asset_id: 1,
                quantity: dec!(2),
                time: datetime!(2023-03-22 13:00:00 UTC),
            },
        ];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![
                AssetRateDto {
                    rate: dec!(2),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(3),
                    date: datetime!(2023-03-22 13:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 14:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();

        assert_eq!(result.len(), 3);
        assert_eq!(result[0].rate, dec!(2));
        assert_eq!(result[1].rate, dec!(9));
        assert_eq!(result[2].rate, dec!(9));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_1_each_trans_multi_asset() {
        let transactions_queue = vec![
            EntriesIntervalSumDto {
                asset_id: 1,
                quantity: dec!(1),
                time: datetime!(2023-03-22 12:00:00 UTC),
            },
            EntriesIntervalSumDto {
                asset_id: 3,
                quantity: dec!(2),
                time: datetime!(2023-03-22 12:00:00 UTC),
            },
        ];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![AssetRateDto {
                rate: dec!(2),
                date: datetime!(2023-03-22 12:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );

        asset_rate_queues.insert(
            (3, 2),
            vec![AssetRateDto {
                rate: dec!(3),
                date: datetime!(2023-03-22 12:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 13:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();

        assert_eq!(result.len(), 2);
        assert_eq!(result[0].rate, dec!(8));
        assert_eq!(result[1].rate, dec!(8));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_multi_trans_multi_asset() {
        let transactions_queue = vec![
            EntriesIntervalSumDto {
                asset_id: 1,
                quantity: dec!(1),
                time: datetime!(2023-03-22 12:00:00 UTC),
            },
            EntriesIntervalSumDto {
                asset_id: 3,
                quantity: dec!(2),
                time: datetime!(2023-03-22 13:00:00 UTC),
            },
            EntriesIntervalSumDto {
                asset_id: 1,
                quantity: dec!(3),
                time: datetime!(2023-03-22 14:00:00 UTC),
            },
            EntriesIntervalSumDto {
                asset_id: 3,
                quantity: dec!(4),
                time: datetime!(2023-03-22 15:00:00 UTC),
            },
        ];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![
                AssetRateDto {
                    rate: dec!(1),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(2),
                    date: datetime!(2023-03-22 13:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(3),
                    date: datetime!(2023-03-22 14:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(4),
                    date: datetime!(2023-03-22 15:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        asset_rate_queues.insert(
            (3, 2),
            vec![
                AssetRateDto {
                    rate: dec!(5),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(6),
                    date: datetime!(2023-03-22 13:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(7),
                    date: datetime!(2023-03-22 14:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(8),
                    date: datetime!(2023-03-22 15:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 15:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();

        assert_eq!(result.len(), 4);
        assert_eq!(result[0].rate, dec!(1));
        assert_eq!(result[1].rate, dec!(14));
        assert_eq!(result[2].rate, dec!(26));
        assert_eq!(result[3].rate, dec!(64));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_multi_trans_multi_asset_with_base() {
        let transactions_queue = vec![
            EntriesIntervalSumDto {
                asset_id: 1,
                quantity: dec!(1),
                time: datetime!(2023-03-22 12:00:00 UTC),
            },
            EntriesIntervalSumDto {
                asset_id: 3,
                quantity: dec!(2),
                time: datetime!(2023-03-22 13:00:00 UTC),
            },
            EntriesIntervalSumDto {
                asset_id: 4,
                quantity: dec!(3),
                time: datetime!(2023-03-22 14:00:00 UTC),
            },
        ];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 3),
            vec![
                AssetRateDto {
                    rate: dec!(1),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(2),
                    date: datetime!(2023-03-22 13:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(3),
                    date: datetime!(2023-03-22 14:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(4),
                    date: datetime!(2023-03-22 15:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        asset_rate_queues.insert(
            (3, 2),
            vec![
                AssetRateDto {
                    rate: dec!(5),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(6),
                    date: datetime!(2023-03-22 13:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(7),
                    date: datetime!(2023-03-22 14:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(8),
                    date: datetime!(2023-03-22 15:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        asset_rate_queues.insert(
            (4, 2),
            vec![
                AssetRateDto {
                    rate: dec!(9),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(10),
                    date: datetime!(2023-03-22 13:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(11),
                    date: datetime!(2023-03-22 14:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(12),
                    date: datetime!(2023-03-22 15:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 15:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();

        assert_eq!(result.len(), 4);
        assert_eq!(result[0].rate, dec!(5));
        assert_eq!(result[1].rate, dec!(24));
        assert_eq!(result[2].rate, dec!(68));
        assert_eq!(result[3].rate, dec!(84));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_base_conversion_order() {
        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        for i in 0..100 {
            asset_rate_queues.insert(
                (i, 999),
                vec![
                    AssetRateDto {
                        rate: dec!(3),
                        date: datetime!(2023-03-22 11:00:00 UTC),
                    },
                    AssetRateDto {
                        rate: dec!(4),
                        date: datetime!(2023-03-22 12:00:00 UTC),
                    },
                ]
                .into_iter()
                .collect(),
            );
        }

        let top_of_the_list = asset_rate_queues.iter().last().unwrap().0.to_owned();
        asset_rate_queues.insert(
            (888, top_of_the_list.0),
            vec![AssetRateDto {
                rate: dec!(2),
                date: datetime!(2023-03-22 12:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );

        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 888,
            quantity: dec!(1),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(999),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].rate, dec!(8));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_rate_updates_but_base_doesnt() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(1),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 3),
            vec![
                AssetRateDto {
                    rate: dec!(1),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(2),
                    date: datetime!(2023-03-22 13:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(3),
                    date: datetime!(2023-03-22 14:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(4),
                    date: datetime!(2023-03-22 15:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        asset_rate_queues.insert(
            (3, 2),
            vec![AssetRateDto {
                rate: dec!(2),
                date: datetime!(2023-03-22 12:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 15:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();

        assert_eq!(result.len(), 4);
        assert_eq!(result[0].rate, dec!(2));
        assert_eq!(result[1].rate, dec!(4));
        assert_eq!(result[2].rate, dec!(6));
        assert_eq!(result[3].rate, dec!(8));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_base_updates_but_rate_doesnt() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(1),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 3),
            vec![AssetRateDto {
                rate: dec!(2),
                date: datetime!(2023-03-22 12:00:00 UTC),
            }]
            .into_iter()
            .collect(),
        );

        asset_rate_queues.insert(
            (3, 2),
            vec![
                AssetRateDto {
                    rate: dec!(1),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(2),
                    date: datetime!(2023-03-22 13:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(3),
                    date: datetime!(2023-03-22 14:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(4),
                    date: datetime!(2023-03-22 15:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 15:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();

        assert_eq!(result.len(), 4);
        assert_eq!(result[0].rate, dec!(2));
        assert_eq!(result[1].rate, dec!(4));
        assert_eq!(result[2].rate, dec!(6));
        assert_eq!(result[3].rate, dec!(8));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_interpolation() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(1),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 2),
            vec![
                AssetRateDto {
                    rate: dec!(1),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(4),
                    date: datetime!(2023-03-22 15:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(1),
                    date: datetime!(2023-03-22 18:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 18:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();
        assert_eq!(result.len(), 7);
        assert_eq!(result[0].rate, dec!(1));
        assert_eq!(result[1].rate, dec!(2));
        assert_eq!(result[2].rate, dec!(3));
        assert_eq!(result[3].rate, dec!(4));
        assert_eq!(result[4].rate, dec!(3));
        assert_eq!(result[5].rate, dec!(2));
        assert_eq!(result[6].rate, dec!(1));
    }

    #[test]
    fn test_calculate_portfolio_hisotry_interpolation_with_base() {
        let transactions_queue = vec![EntriesIntervalSumDto {
            asset_id: 1,
            quantity: dec!(1),
            time: datetime!(2023-03-22 12:00:00 UTC),
        }];

        let mut asset_rate_queues: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();
        asset_rate_queues.insert(
            (1, 3),
            vec![
                AssetRateDto {
                    rate: dec!(1),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(4),
                    date: datetime!(2023-03-22 15:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(1),
                    date: datetime!(2023-03-22 18:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        asset_rate_queues.insert(
            (3, 2),
            vec![
                AssetRateDto {
                    rate: dec!(1),
                    date: datetime!(2023-03-22 12:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(4),
                    date: datetime!(2023-03-22 15:00:00 UTC),
                },
                AssetRateDto {
                    rate: dec!(1),
                    date: datetime!(2023-03-22 18:00:00 UTC),
                },
            ]
            .into_iter()
            .collect(),
        );

        let mut net_worth_history = NetWorthHistory::new(
            AssetIdDto(2),
            RangeDto::Custom(
                Some(datetime!(2023-03-22 12:00:00 UTC)),
                Some(datetime!(2023-03-22 18:00:00 UTC)),
                Some(Duration::hours(1)),
            )
            .try_into()
            .unwrap(),
        );

        net_worth_history.add_entries(transactions_queue.into_iter());
        let asset_rate_queues: HashMap<AssetPairIdsDto, VecDeque<AssetRateDto>> = asset_rate_queues
            .into_iter()
            .map(|(k, v)| (AssetPairIdsDto::new(AssetIdDto(k.0), AssetIdDto(k.1)), v))
            .collect();
        net_worth_history.add_asset_rates(asset_rate_queues);

        let result = net_worth_history.calculate_networth_history();
        assert_eq!(result.len(), 7);
        assert_eq!(result[0].rate, dec!(1));
        assert_eq!(result[1].rate, dec!(4));
        assert_eq!(result[2].rate, dec!(9));
        assert_eq!(result[3].rate, dec!(16));
        assert_eq!(result[4].rate, dec!(9));
        assert_eq!(result[5].rate, dec!(4));
        assert_eq!(result[6].rate, dec!(1));
    }
}
