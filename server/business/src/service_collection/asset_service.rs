use std::collections::{HashMap, HashSet, VecDeque};

use dal::{
    db_sets::asset_db_set::{self},
    models::{
        asset_models::{Asset, AssetId, AssetPairId, PublicAsset},
        asset_pair::AssetPair,
        asset_pair_rate::AssetPairRate,
        asset_rate::AssetRate,
        count::Count,
        exists::Exsists,
    },
};

#[mockall_double::double]
use dal::database_context::MyraDb;

use time::OffsetDateTime;
use uuid::Uuid;

use crate::dtos::{
    add_custom_asset_dto::AddCustomAssetDto, asset_dto::AssetDto, asset_insert_dto::AssetInsertDto,
    asset_insert_result_dto::InsertAssetResultDto, asset_pair_insert_dto::AssetPairInsertDto,
    asset_pair_rate_dto::AssetPairRateDto, asset_pair_rate_insert_dto::AssetPairRateInsertDto,
    asset_rate_dto::AssetRateDto,
};

#[derive(Clone)]
pub struct AssetsService {
    db: MyraDb,
}

impl AssetsService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_public_assets(
        &self,
        page: u64,
        search: Option<String>,
    ) -> anyhow::Result<Vec<AssetDto>> {
        let page_size = 20;
        let query = asset_db_set::get_public_assets(page_size, page, search);
        let models = self.db.fetch_all::<PublicAsset>(query).await?;

        let ret_vec: Vec<AssetDto> = models.into_iter().map(|val| val.into()).collect();

        Ok(ret_vec)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_all_user_assets(&self, user_id: Uuid) -> anyhow::Result<Vec<AssetDto>> {
        let query = asset_db_set::get_users_assets(user_id.clone());
        let models = self.db.fetch_all::<PublicAsset>(query).await?;

        let ret_vec: Vec<AssetDto> = models
            .into_iter()
            .map(|val| AssetDto {
                ticker: val.ticker,
                name: val.name,
                category: val.category,
                asset_id: val.id,
                owner: Some(user_id.clone()),
            })
            .collect();

        Ok(ret_vec)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn check_assets_access(
        &self,
        user_id: Uuid,
        asset_ids: Vec<i32>,
    ) -> anyhow::Result<()> {
        let nums = asset_ids.len() as i64;
        let query = asset_db_set::assets_count_by_ids_and_access(asset_ids, user_id);
        let models = self.db.fetch_one::<Count>(query).await?;
        if models.count != nums {
            return Err(anyhow::anyhow!(
                "Not all assets found or no permission fot them"
            ));
        }

        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_asset(&self, id: i32) -> anyhow::Result<AssetDto> {
        let query = asset_db_set::get_asset(id);
        let model = self.db.fetch_one::<Asset>(query).await?;

        Ok(model.into())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_assets_rates_default_latest(
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

        Ok(result)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_assets_rates_default_from_date(
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

        if !non_default_rates_pair1_ids.is_empty() {
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

        Ok(result)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_asset_pair_rates(
        &self,
        pair1: i32,
        pair2: i32,
    ) -> anyhow::Result<Vec<AssetRateDto>> {
        let query = asset_db_set::get_pair_rates(pair1, pair2);
        let ret = self.db.fetch_all::<AssetRate>(query).await?;

        let result: Vec<AssetRateDto> = ret.into_iter().map(|x| x.into()).collect();

        Ok(result)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_asset_pair_id(&self, pair1: i32, pair2: i32) -> anyhow::Result<i32> {
        let query = asset_db_set::get_pair_id(pair1, pair2);
        let ret = self.db.fetch_one::<AssetPairId>(query).await?;
        Ok(ret.id)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn add_asset(&self, rate: AssetInsertDto) -> anyhow::Result<InsertAssetResultDto> {
        self.db.start_transaction().await?;
        let asset_id = self.insert_asset(rate.clone()).await?;
        if rate.base_pair_id.is_some() {
            let pair = AssetPairInsertDto {
                pair1: asset_id,
                pair2: rate.base_pair_id.unwrap(),
            };
            let asset_pair_id = self.insert_asset_pair(pair).await?;
            self.db.commit_transaction().await?;
            return Ok(InsertAssetResultDto {
                new_asset_id: asset_id,
                new_asset_pair_id: Some(asset_pair_id),
            });
        }
        self.db.commit_transaction().await?;
        Ok(InsertAssetResultDto {
            new_asset_id: asset_id,
            new_asset_pair_id: None,
        })
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn add_custom_asset(&self, asset_dto: AddCustomAssetDto) -> anyhow::Result<AssetDto> {
        self.db.start_transaction().await?;

        let asset_insert = AssetInsertDto {
            name: asset_dto.name.clone(),
            ticker: asset_dto.ticker.clone(),
            asset_type: asset_dto.asset_type,
            base_pair_id: Some(asset_dto.base_pair_id),
            user_id: Some(asset_dto.user_id),
        };

        let asset_id = self.insert_asset(asset_insert).await?;

        let asset_pair_insert = AssetPairInsertDto {
            pair1: asset_id,
            pair2: asset_dto.base_pair_id,
        };

        self.insert_asset_pair(asset_pair_insert).await?;

        //TODO: We have most of the information, except for type string,
        //so in the future we could improve this by not doing a sperate query
        let ret = self.get_asset(asset_id).await?;

        self.db.commit_transaction().await?;

        Ok(ret)
    }

    pub async fn add_rates_by_pair(
        &self,
        pair1: i32,
        pair2: i32,
        rates: Vec<AssetRateDto>,
    ) -> anyhow::Result<()> {
        let pair_id = self.get_asset_pair_id(pair1, pair2).await?;

        let inserts: Vec<AssetPairRateInsertDto> = rates
            .into_iter()
            .map(|rate| AssetPairRateInsertDto {
                pair_id,
                rate: rate.rate,
                date: rate.date,
            })
            .collect();

        self.insert_asset_pair_rates(inserts).await?;
        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn validate_asset_ownership(
        &self,
        user_id: Uuid,
        asset_id: i32,
    ) -> anyhow::Result<bool> {
        let query = asset_db_set::asset_exists_by_id_and_user_id(asset_id, user_id);
        let ret = self.db.fetch_one::<Exsists>(query).await?;
        Ok(ret.exists)
    }

    #[tracing::instrument(skip_all, err)]
    async fn insert_asset(&self, asset_dto: AssetInsertDto) -> anyhow::Result<i32> {
        let query = asset_db_set::insert_asset(asset_dto.clone().into());
        let asset_id = self.db.fetch_one::<AssetId>(query).await?;
        Ok(asset_id.id)
    }

    #[tracing::instrument(skip_all, err)]
    async fn insert_asset_pair(&self, pair_dto: AssetPairInsertDto) -> anyhow::Result<i32> {
        let query = asset_db_set::inser_pair(pair_dto.into());
        let asset_pair_id = self.db.fetch_one::<AssetPairId>(query).await?;
        Ok(asset_pair_id.id)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn insert_asset_pair_rate(&self, rate: AssetPairRateInsertDto) -> anyhow::Result<()> {
        self.insert_asset_pair_rates(vec![rate]).await?;
        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn insert_asset_pair_rates(
        &self,
        rates: Vec<AssetPairRateInsertDto>,
    ) -> anyhow::Result<()> {
        if rates.is_empty() {
            return Ok(());
        }

        let query = asset_db_set::insert_pair_rates(rates.into_iter().map(|x| x.into()).collect());
        self.db.execute(query).await?;
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
                user_id: None,
            }])
        });

        let service = AssetsService { db: mock_db };

        // Call the method
        let result = service.get_public_assets(1, None).await;

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
        let result = service
            .get_public_assets(1, Some("nonexistent".to_string()))
            .await;

        // Assert
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }
}
