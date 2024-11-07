use std::collections::{HashMap, HashSet};

use anyhow::bail;
#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::{
    models::asset_models::{AssetPair, AssetPairRate, AssetRate},
    queries::asset_queries,
    query_params::get_rates_params::{GetRatesParams, GetRatesSeachType, GetRatesTimeParams},
};
use mockall::automock;
use time::Duration;
use tracing::error;

use crate::dtos::asset_rate_dto::AssetRateDto;

pub struct AssetRatesService {
    db: MyraDb,
}

#[automock]
impl AssetRatesService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_asset_pair_latest_rate(
        &self,
        pair1: i32,
        pair2: i32,
    ) -> anyhow::Result<Option<AssetRateDto>> {
        let search_set = HashSet::from([(pair1, pair2)]);
        let latest_rates = self.get_asset_pairs_latest_rate(search_set).await?;
        let first = latest_rates.into_iter().next();
        if let Some((_, first)) = first {
            return Ok(Some(first));
        }
        Ok(None)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_asset_pairs_latest_rate(
        &self,
        asset_ids: HashSet<(i32, i32)>,
    ) -> anyhow::Result<HashMap<(i32, i32), AssetRateDto>> {
        let assets_ids_len = asset_ids.len();
        let query = asset_queries::get_latest_asset_pair_rates(
            asset_ids
                .into_iter()
                .map(|x| AssetPair {
                    pair1: x.0,
                    pair2: x.1,
                })
                .collect(),
            None,
        );

        let rates = self.db.fetch_all::<AssetPairRate>(query).await?;

        if rates.len() > assets_ids_len {
            error!("Too many rates returned from latest rates query");
            bail!("");
        }

        let result: HashMap<(i32, i32), AssetRateDto> = rates
            .into_iter()
            .map(|val| {
                (
                    (val.pair1, val.pair2),
                    AssetRateDto {
                        rate: val.rate,
                        date: val.recorded_at,
                    },
                )
            })
            .collect();

        Ok(result)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_asset_pair_rates_by_duration(
        &self,
        pair1: i32,
        pair2: i32,
        duration: Duration,
    ) -> anyhow::Result<Vec<AssetRateDto>> {
        let params = GetRatesParams {
            search_type: GetRatesSeachType::ByPair(pair1, pair2),
            interval: GetRatesTimeParams {
                start_date: time::OffsetDateTime::now_utc() - duration,
                end_date: time::OffsetDateTime::now_utc(),
            },
        };

        let query = asset_queries::get_rates(params);
        let ret = self.db.fetch_all::<AssetRate>(query).await?;

        let result: Vec<AssetRateDto> = ret.into_iter().map(|x| x.into()).collect();

        Ok(result)
    }
}
