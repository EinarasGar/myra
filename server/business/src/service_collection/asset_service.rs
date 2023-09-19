use std::collections::{HashMap, HashSet, VecDeque};

use dal::{
    database_context::MyraDb,
    db_sets::asset_db_set::AssetDbSet,
    models::{asset_pair::AssetPair, asset_pair_rate::AssetPairRate},
};
use rust_decimal::Decimal;
use time::OffsetDateTime;

use crate::dtos::{
    asset_dto::AssetDto, asset_pair_rate_dto::AssetPairRateDto, asset_rate_dto::AssetRateDto,
};

use super::Services;

#[derive(Clone)]
pub struct AssetsService {
    db: MyraDb,
}

impl AssetsService {
    pub fn new(services: Services) -> Self {
        Self {
            db: services.context,
        }
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_assets(
        &self,
        page: u64,
        search: Option<String>,
    ) -> anyhow::Result<Vec<AssetDto>> {
        let page_size = 20;
        let models = self
            .db
            .get_connection()
            .await?
            .get_assets(page_size, page, search)
            .await?;

        let ret_vec: Vec<AssetDto> = models.into_iter().map(|val| val.into()).collect();

        Ok(ret_vec)
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_asset(&self, id: i32) -> anyhow::Result<AssetDto> {
        let model = self.db.get_connection().await?.get_asset(id).await?;

        Ok(model.into())
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_asset_rates_default_latest(
        &self,
        default_asset_id: i32,
        asset_ids: HashSet<i32>,
    ) -> anyhow::Result<HashMap<i32, AssetPairRateDto>> {
        let mut result: HashMap<i32, AssetPairRateDto> = HashMap::new();

        let ret = self
            .db
            .get_connection()
            .await?
            .get_latest_asset_pair_rates(
                asset_ids
                    .into_iter()
                    .map(|x| AssetPair {
                        pair1: x,
                        pair2: default_asset_id,
                    })
                    .collect(),
                None,
                true,
            )
            .await?;

        for pair in ret {
            result.insert(pair.pair1, pair.into());
        }

        return Ok(result);
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_asset_rates_default_from_date(
        &self,
        default_asset_id: i32,
        asset_ids: HashSet<i32>,
        staret_time: OffsetDateTime,
    ) -> anyhow::Result<HashMap<(i32, i32), VecDeque<AssetRateDto>>> {
        let mut result: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();

        let ret = self
            .db
            .get_connection()
            .await?
            .get_latest_asset_pair_rates(
                asset_ids
                    .into_iter()
                    .map(|x| AssetPair {
                        pair1: x,
                        pair2: default_asset_id,
                    })
                    .collect(),
                Some(staret_time),
                false,
            )
            .await?;

        for pair in ret {
            result
                .entry((pair.pair1, pair.pair2))
                .or_insert(VecDeque::new())
                .push_back(AssetRateDto {
                    rate: pair.rate,
                    date: pair.date,
                })
        }

        let non_default_rates_pair1_ids: Vec<i32> = result
            .keys()
            .filter(|p| p.1 != default_asset_id)
            .map(|p| p.1)
            .collect();

        if non_default_rates_pair1_ids.len() > 0 {
            let ret_bases = self
                .db
                .get_connection()
                .await?
                .get_latest_asset_pair_rates(
                    non_default_rates_pair1_ids
                        .into_iter()
                        .map(|x| AssetPair {
                            pair1: x,
                            pair2: default_asset_id,
                        })
                        .collect(),
                    Some(staret_time),
                    false,
                )
                .await?;

            for pair in ret_bases {
                result
                    .entry((pair.pair1, pair.pair2))
                    .or_insert(VecDeque::new())
                    .push_back(AssetRateDto {
                        rate: pair.rate,
                        date: pair.date,
                    })
            }
        }

        return Ok(result);
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_asset_pair_rates(
        &self,
        pair1: i32,
        pair2: i32,
    ) -> anyhow::Result<Vec<AssetRateDto>> {
        let ret = self
            .db
            .get_connection()
            .await?
            .get_pair_rates(pair1, pair2)
            .await?;

        let result: Vec<AssetRateDto> = ret.into_iter().map(|x| x.into()).collect();

        return Ok(result);
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn add_asset_rate(&self, rate: AssetPairRateDto) -> anyhow::Result<()> {
        let ret = self
            .db
            .get_connection()
            .await?
            .insert_pair_rate(rate.into())
            .await?;
        Ok(())
    }
}
