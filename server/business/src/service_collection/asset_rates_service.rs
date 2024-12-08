use std::collections::{HashMap, HashSet, VecDeque};

#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::{
    models::asset_models::{AssetPair, AssetPairRate, AssetPairRateOption, AssetRate},
    queries::asset_queries,
    query_params::get_rates_params::{GetRatesParams, GetRatesSeachType, GetRatesTimeParams},
};
use mockall::automock;
use rust_decimal_macros::dec;
use time::Duration;

use crate::dtos::{
    asset_id_date_dto::AssetIdDateDto, asset_pair_date_dto::AssetPairDateDto,
    asset_pair_rate_dto::AssetPairRateDto, asset_pair_rate_insert_dto::AssetPairRateInsertDto,
    asset_rate_dto::AssetRateDto, assets::asset_id_dto::AssetIdDto,
    assets::asset_pair_ids_dto::AssetPairIdsDto,
};

pub struct AssetRatesService {
    db: MyraDb,
}

#[automock]
impl AssetRatesService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_pair_latest_direct(
        &self,
        pair: AssetPairIdsDto,
    ) -> anyhow::Result<Option<AssetRateDto>> {
        let params = GetRatesParams {
            search_type: GetRatesSeachType::ByPair(pair.pair1.0, pair.pair2.0),
            limit: Some(1),
            ..Default::default()
        };

        let query = asset_queries::get_rates(params);
        let ret = self.db.fetch_optional::<AssetRate>(query).await?;
        Ok(ret.map(Into::into))
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_pairs_latest_converted(
        &self,
        asset_ids: HashSet<AssetIdDto>,
        reference_asset_id: AssetIdDto,
    ) -> anyhow::Result<HashMap<AssetPairIdsDto, AssetRateDto>> {
        if asset_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let self_referencing_id_found = asset_ids.contains(&reference_asset_id);

        let mut result = HashMap::new();

        let pairs: HashSet<AssetPairIdsDto> = asset_ids
            .into_iter()
            .filter(|x| x != &reference_asset_id)
            .map(|x| AssetPairIdsDto::new(x, reference_asset_id.clone()))
            .collect();

        let query = asset_queries::get_latest_asset_pair_rates(
            pairs.iter().map(|x| x.clone().into()).collect(),
            None,
        );

        let rates = self.db.fetch_all::<AssetPairRate>(query).await?;

        let fallbacked_rates: Vec<AssetPairRate> = rates
            .iter()
            .filter(|x| x.pair2 != reference_asset_id.0)
            .cloned()
            .collect();

        let bases_query = asset_queries::get_latest_asset_pair_rates(
            fallbacked_rates
                .iter()
                .map(|x| AssetPair {
                    pair1: x.pair2,
                    pair2: reference_asset_id.0,
                })
                .collect(),
            None,
        );

        let base_rates = self.db.fetch_all::<AssetPairRate>(bases_query).await?;

        for rate in rates {
            if rate.pair2 != reference_asset_id.0 {
                let base_rate = base_rates.iter().find(|x| x.pair1 == rate.pair2);
                if let Some(base_rate) = base_rate {
                    result.insert(
                        AssetPairIdsDto::new(AssetIdDto(rate.pair1), reference_asset_id.clone()),
                        AssetRateDto {
                            rate: rate.rate * base_rate.rate,
                            date: rate.recorded_at,
                        },
                    );
                }
            } else {
                result.insert(
                    AssetPairIdsDto::new(AssetIdDto(rate.pair1), AssetIdDto(rate.pair2)),
                    AssetRateDto {
                        rate: rate.rate,
                        date: rate.recorded_at,
                    },
                );
            }
        }

        if self_referencing_id_found {
            result.insert(
                AssetPairIdsDto::new(reference_asset_id.clone(), reference_asset_id.clone()),
                AssetRateDto {
                    rate: dec!(1),
                    date: time::OffsetDateTime::now_utc(),
                },
            );
        }

        Ok(result)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_pairs_by_duration_direct(
        &self,
        pair: AssetPairIdsDto,
        duration: Duration,
    ) -> anyhow::Result<Vec<AssetRateDto>> {
        let params = GetRatesParams {
            search_type: GetRatesSeachType::ByPair(pair.pair1.0, pair.pair2.0),
            interval: Some(GetRatesTimeParams {
                start_date: time::OffsetDateTime::now_utc() - duration,
                end_date: time::OffsetDateTime::now_utc(),
            }),
            ..Default::default()
        };

        let query = asset_queries::get_rates(params);
        let ret = self.db.fetch_all::<AssetRate>(query).await?;

        let result: Vec<AssetRateDto> = ret.into_iter().map(|x| x.into()).collect();

        Ok(result)
    }

    // #[tracing::instrument(skip_all, err)]
    // pub async fn get_assets_rates_default_from_date(
    //     &self,
    //     default_asset_id: i32,
    //     asset_ids: HashSet<i32>,
    //     start_time: Option<time::OffsetDateTime>,
    // ) -> anyhow::Result<HashMap<(i32, i32), VecDeque<AssetRateDto>>> {
    //     let mut result: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();

    //     let query = asset_queries::get_latest_asset_pair_rates(
    //         asset_ids
    //             .into_iter()
    //             .map(|x| AssetPair {
    //                 pair1: x,
    //                 pair2: default_asset_id,
    //             })
    //             .collect(),
    //         start_time,
    //     );
    //     let ret = self.db.fetch_all::<AssetPairRate>(query).await?;

    //     for pair in ret {
    //         result
    //             .entry((pair.pair1, pair.pair2))
    //             .or_default()
    //             .push_back(AssetRateDto {
    //                 rate: pair.rate,
    //                 date: pair.recorded_at,
    //             })
    //     }

    //     let non_default_rates_pair1_ids: Vec<i32> = result
    //         .keys()
    //         .filter(|p| p.1 != default_asset_id)
    //         .map(|p| p.1)
    //         .collect();

    //     if !non_default_rates_pair1_ids.is_empty() {
    //         let query = asset_queries::get_latest_asset_pair_rates(
    //             non_default_rates_pair1_ids
    //                 .into_iter()
    //                 .map(|x| AssetPair {
    //                     pair1: x,
    //                     pair2: default_asset_id,
    //                 })
    //                 .collect(),
    //             start_time,
    //         );

    //         let ret_bases = self.db.fetch_all::<AssetPairRate>(query).await?;

    //         for pair in ret_bases {
    //             result
    //                 .entry((pair.pair1, pair.pair2))
    //                 .or_default()
    //                 .push_back(AssetRateDto {
    //                     rate: pair.rate,
    //                     date: pair.recorded_at,
    //                 })
    //         }
    //     }

    //     Ok(result)
    // }

    #[tracing::instrument(skip_all, err)]
    pub async fn insert_pair_single(&self, rate: AssetPairRateInsertDto) -> anyhow::Result<()> {
        self.insert_pair_many(vec![rate]).await?;
        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn insert_pair_many(&self, rates: Vec<AssetPairRateInsertDto>) -> anyhow::Result<()> {
        if rates.is_empty() {
            return Ok(());
        }

        let query = asset_queries::insert_pair_rates(rates.into_iter().map(|x| x.into()).collect());
        self.db.execute(query).await?;
        Ok(())
    }

    /// This method takes a list of asset pairs and dates
    /// It then queries the database to find prices for those pairs
    /// If the pair for the two provided ids is found, the price for it is returned
    /// if it is not foud, the price for base conversion is returned
    /// The number of elements returned is the same as the number of elements in the input list
    /// For elements where id is found but price is not, the Option for rate and date will be null
    #[tracing::instrument(skip_all, err)]
    pub async fn get_pair_prices_by_dates(
        &self,
        pair_dates: Vec<AssetPairDateDto>,
    ) -> anyhow::Result<Vec<Option<AssetPairRateDto>>> {
        if pair_dates.is_empty() {
            return Ok(vec![]);
        }

        let query = asset_queries::get_pair_prices_by_dates(
            pair_dates.into_iter().map(|x| x.into()).collect(),
        );
        let ret = self.db.fetch_all::<AssetPairRateOption>(query).await?;

        Ok(ret
            .into_iter()
            .rev()
            .map(|x| {
                if x.rate.is_some() {
                    Some(AssetPairRateDto {
                        asset1_id: x.pair1,
                        asset2_id: x.pair2,
                        rate: x.rate.unwrap(),
                        date: x.date.unwrap(),
                    })
                } else {
                    None
                }
            })
            .collect())
    }

    /// This method takes in a list of asset id and date pairs plus reference asset id
    /// It then generates a list of asset pairs with the reference asset id
    /// It queries the database to get prices for those dates and that asset
    /// The first query that it runs returns prices for asset to direct conversio to refference
    /// plus prices with base pair if the direct conversion is not found
    /// Another query is performed if there are any prices returned that are not direct conversion
    /// to get the correct conversion price to reference asset
    #[tracing::instrument(skip_all, err)]
    pub async fn get_pairs_by_dates_converted(
        &self,
        asset_id_dates: Vec<AssetIdDateDto>,
        reference_asset_id: i32,
    ) -> anyhow::Result<Vec<Option<AssetPairRateDto>>> {
        if asset_id_dates.is_empty() {
            return Ok(vec![]);
        }

        let initial_pair_dates: Vec<AssetPairDateDto> = asset_id_dates
            .into_iter()
            .map(|x| AssetPairDateDto {
                asset1_id: x.asset_id,
                asset2_id: reference_asset_id,
                date: x.date,
            })
            .collect();

        let prices = self.get_pair_prices_by_dates(initial_pair_dates).await?;

        // Find any prices returned that does not have reference asset mapping.
        let mut ref_pair_dates: Vec<AssetPairDateDto> = Vec::new();
        for price in prices.clone().into_iter().flatten() {
            if price.asset2_id != reference_asset_id {
                ref_pair_dates.push(AssetPairDateDto {
                    asset1_id: price.asset2_id,
                    asset2_id: reference_asset_id,
                    date: price.date,
                });
            }
        }

        let mut mapping_prices_queue: VecDeque<Option<AssetPairRateDto>> = VecDeque::new();
        if !ref_pair_dates.is_empty() {
            mapping_prices_queue = self
                .get_pair_prices_by_dates(ref_pair_dates)
                .await?
                .into_iter()
                .collect();
        }

        // Iterate over initial prices list in the same order, so that the reference queue is read in the correct squence
        let mut mapped_prices: Vec<Option<AssetPairRateDto>> = Vec::new();
        for price in prices {
            if let Some(price) = price {
                if price.asset2_id != reference_asset_id {
                    if let Some(Some(ref_rate)) = mapping_prices_queue.pop_front() {
                        mapped_prices.push(Some(AssetPairRateDto {
                            asset1_id: price.asset1_id,
                            asset2_id: reference_asset_id,
                            date: price.date,
                            rate: price.rate * ref_rate.rate,
                        }));
                    } else {
                        mapped_prices.push(None);
                    }
                } else {
                    mapped_prices.push(Some(price));
                }
            } else {
                mapped_prices.push(None);
            }
        }

        Ok(mapped_prices)
    }
}
