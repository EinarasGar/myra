use std::collections::{HashMap, HashSet, VecDeque};

use dal::{
    db_sets::asset_db_set::{self},
    models::{
        asset_models::Asset, asset_pair::AssetPair, asset_pair_rate::AssetPairRate,
        asset_rate::AssetRate,
    },
};

#[mockall_double::double]
use dal::database_context::MyraDb;

use time::OffsetDateTime;

use crate::dtos::{
    asset_dto::AssetDto, asset_pair_rate_dto::AssetPairRateDto, asset_rate_dto::AssetRateDto,
};

#[derive(Clone)]
pub struct AssetsService {
    db: MyraDb,
}

impl AssetsService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_assets(
        &self,
        page: u64,
        search: Option<String>,
    ) -> anyhow::Result<Vec<AssetDto>> {
        let page_size = 20;
        let query = asset_db_set::get_assets(page_size, page, search);
        let models = self.db.fetch_all::<Asset>(query).await?;

        let ret_vec: Vec<AssetDto> = models.into_iter().map(|val| val.into()).collect();

        Ok(ret_vec)
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_asset(&self, id: i32) -> anyhow::Result<AssetDto> {
        let query = asset_db_set::get_asset(id);
        let model = self.db.fetch_one::<Asset>(query).await?;

        Ok(model.into())
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_asset_rates_default_latest(
        &self,
        default_asset_id: i32,
        asset_ids: HashSet<i32>,
    ) -> anyhow::Result<HashMap<i32, AssetPairRateDto>> {
        let mut result: HashMap<i32, AssetPairRateDto> = HashMap::new();

        let query = asset_db_set::get_latest_asset_pair_rates(
            asset_ids
                .into_iter()
                .map(|x| AssetPair {
                    pair1: x,
                    pair2: default_asset_id,
                })
                .collect(),
            None,
            true,
        );
        let ret = self.db.fetch_all::<AssetPairRate>(query).await?;

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

        let query = asset_db_set::get_latest_asset_pair_rates(
            asset_ids
                .into_iter()
                .map(|x| AssetPair {
                    pair1: x,
                    pair2: default_asset_id,
                })
                .collect(),
            Some(staret_time),
            false,
        );
        let ret = self.db.fetch_all::<AssetPairRate>(query).await?;

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
            let query = asset_db_set::get_latest_asset_pair_rates(
                non_default_rates_pair1_ids
                    .into_iter()
                    .map(|x| AssetPair {
                        pair1: x,
                        pair2: default_asset_id,
                    })
                    .collect(),
                Some(staret_time),
                false,
            );

            let ret_bases = self.db.fetch_all::<AssetPairRate>(query).await?;

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
        let query = asset_db_set::get_pair_rates(pair1, pair2);
        let ret = self.db.fetch_all::<AssetRate>(query).await?;

        let result: Vec<AssetRateDto> = ret.into_iter().map(|x| x.into()).collect();

        return Ok(result);
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn add_asset_rate(&self, rate: AssetPairRateDto) -> anyhow::Result<()> {
        let query = asset_db_set::insert_pair_rate(rate.into());

        let _ret = self.db.execute(query).await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use dal::database_context::MockMyraDb;

    #[tokio::test]
    async fn test_get_assets_happy_path() {
        let mut mock_db = MockMyraDb::default();

        // Set expectations
        mock_db.expect_fetch_all::<Asset>().returning(|_query| {
            Ok(vec![Asset {
                category: "category".to_string(),
                name: "name".to_string(),
                ticker: "ticker".to_string(),
                id: 1,
            }])
        });

        let service = AssetsService { db: mock_db };

        // Call the method
        let result = service.get_assets(1, None).await;

        // Assert
        assert!(result.is_ok());
        let assets = result.unwrap();
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].category, "category");
        assert_eq!(assets[0].name, "name");
        assert_eq!(assets[0].ticker, "ticker");
        assert_eq!(assets[0].asset_id, 1);
    }

    #[tokio::test]
    async fn test_get_assets_no_assets_found() {
        let mut mock_db = MockMyraDb::default();

        // Set expectations
        mock_db
            .expect_fetch_all::<Asset>()
            .returning(|_query| Ok(vec![]));

        let service = AssetsService { db: mock_db };

        // Call the method
        let result = service.get_assets(1, Some("nonexistent".to_string())).await;

        // Assert
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }
}
