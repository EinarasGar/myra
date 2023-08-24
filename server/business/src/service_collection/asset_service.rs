use std::collections::{HashMap, HashSet};

use dal::{
    database_context::MyraDb,
    db_sets::asset_db_set::AssetDbSet,
    models::{asset_pair::AssetPair, asset_pair_rate::AssetPairRate},
};
use rust_decimal::Decimal;
use time::OffsetDateTime;

use crate::dtos::{asset_dto::AssetDto, asset_pair_rate_dto::AssetPairRateDto};

#[derive(Clone)]
pub struct AssetsService {
    db: MyraDb,
}

impl AssetsService {
    pub fn new(db_context: MyraDb) -> Self {
        Self { db: db_context }
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

        let ret_vec: Vec<AssetDto> = models.iter().map(|val| val.clone().into()).collect();

        Ok(ret_vec)
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_asset(&self, id: i32) -> anyhow::Result<AssetDto> {
        let model = self.db.get_connection().await?.get_asset(id).await?;

        Ok(model.into())
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_asset_prices_default(
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
                    .iter()
                    .map(|x| AssetPair {
                        pair1: *x,
                        pair2: default_asset_id.clone(),
                    })
                    .collect(),
            )
            .await?;

        for pair in ret {
            result.insert(pair.pair1, pair.into());
        }

        return Ok(result);
    }
}
