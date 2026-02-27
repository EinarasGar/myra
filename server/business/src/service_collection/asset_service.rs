use std::collections::HashSet;

use dal::{
    models::{
        asset_models::{
            Asset, AssetBasePair, AssetId, AssetPair, AssetPairId, AssetPairSharedMetadata,
            AssetPairUserMetadata, AssetRaw, AssetWithMetadata, PublicAsset,
        },
        base::{Count, Exsists, TotalCount},
    },
    queries::asset_queries,
    query_params::get_assets_params::GetAssetsParams,
};

#[mockall_double::double]
use dal::database_context::MyraDb;

use mockall::automock;
use uuid::Uuid;

use crate::dtos::{
    self,
    add_custom_asset_dto::AddCustomAssetDto,
    asset_dto::AssetDto,
    asset_insert_dto::AssetInsertDto,
    asset_insert_result_dto::InsertAssetResultDto,
    asset_pair_insert_dto::AssetPairInsertDto,
    asset_ticker_pair_ids_dto::AssetTickerPairIdsDto,
    assets::{
        asset_dto, full_asset_dto::FullAssetDto,
        shared_asset_pair_metadata_dto::SharedAssetPairMetadataDto,
        update_asset_dto::UpdateAssetDto,
    },
    page_of_results_dto::PageOfResultsDto,
    paging_dto::PagingDto,
};

pub struct AssetsService {
    db: MyraDb,
}

#[automock]
impl AssetsService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_asset_with_metadata(&self, id: i32) -> anyhow::Result<FullAssetDto> {
        let query = asset_queries::get_asset_with_metadata(GetAssetsParams::by_id(id));
        let model = self.db.fetch_optional::<AssetWithMetadata>(query).await?;

        if let Some(model) = model {
            return Ok(model.into());
        } else {
            return Err(anyhow::anyhow!("Asset not found"));
        }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn search_assets(
        &self,
        paging: PagingDto,
        query: Option<String>,
    ) -> anyhow::Result<PageOfResultsDto<asset_dto::AssetDto>> {
        let query = if let Some(query) = query {
            asset_queries::get_asset_with_metadata(GetAssetsParams::by_query(
                query,
                paging.start,
                paging.count,
            ))
        } else {
            asset_queries::get_asset_with_metadata(GetAssetsParams::all(paging.start, paging.count))
        };

        let counted_models = self.db.fetch_all::<TotalCount<Asset>>(query).await?;

        if let Some(first) = counted_models.first() {
            let total_results = first.total_results;
            let models: Vec<Asset> = counted_models.into_iter().map(|x| x.model).collect();
            let ret_vec: Vec<asset_dto::AssetDto> = models.into_iter().map(Into::into).collect();
            let page = PageOfResultsDto {
                results: ret_vec,
                total_results: total_results as i32,
            };
            Ok(page)
        } else {
            Ok(PageOfResultsDto {
                results: vec![],
                total_results: 0,
            })
        }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_asset_pair(
        &self,
        pair1: i32,
        pair2: i32,
    ) -> anyhow::Result<(
        dtos::assets::asset_dto::AssetDto,
        dtos::assets::asset_dto::AssetDto,
    )> {
        let query = asset_queries::get_asset_with_metadata(GetAssetsParams::by_pair(pair1, pair2));
        let models = self.db.fetch_all::<Asset>(query).await?;

        if models.len() != 2 {
            return Err(anyhow::anyhow!("Pair not found"));
        }

        let ret1: dtos::assets::asset_dto::AssetDto = models[1].clone().into();
        let ret2: dtos::assets::asset_dto::AssetDto = models[0].clone().into();
        Ok((ret1, ret2))
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_assets(&self, ids: HashSet<i32>) -> anyhow::Result<Vec<asset_dto::AssetDto>> {
        let query = asset_queries::get_asset_with_metadata(GetAssetsParams::by_ids(ids));
        let models = self.db.fetch_all::<Asset>(query).await?;
        let ret_vec: Vec<asset_dto::AssetDto> = models.into_iter().map(Into::into).collect();
        Ok(ret_vec)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_shared_asset_pair_metadata(
        &self,
        pair1: i32,
        pair2: i32,
    ) -> anyhow::Result<Option<SharedAssetPairMetadataDto>> {
        let query = asset_queries::get_shared_asset_pair_metadata(vec![AssetPair { pair1, pair2 }]);
        let models = self
            .db
            .fetch_optional::<AssetPairSharedMetadata>(query)
            .await?;

        if let Some(model) = models {
            return Ok(Some(model.into()));
        } else {
            return Ok(None);
        }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_asset(&self, id: i32) -> anyhow::Result<AssetDto> {
        let query = asset_queries::get_asset(id);
        let model = self.db.fetch_one::<Asset>(query).await?;

        Ok(model.into())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_all_assets_ticker_and_pair_ids(
        &self,
    ) -> anyhow::Result<Vec<AssetTickerPairIdsDto>> {
        let query = asset_queries::get_assets_raw();
        let models = self.db.fetch_all::<AssetRaw>(query).await?;

        let ret_vec: Vec<AssetTickerPairIdsDto> =
            models.into_iter().map(|val| val.into()).collect();

        Ok(ret_vec)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_public_assets(
        &self,
        page: u64,
        search: Option<String>,
    ) -> anyhow::Result<Vec<AssetDto>> {
        let page_size = 20;
        let query = asset_queries::get_public_assets(page_size, page, search);
        let models = self.db.fetch_all::<PublicAsset>(query).await?;

        let ret_vec: Vec<AssetDto> = models.into_iter().map(|val| val.into()).collect();

        Ok(ret_vec)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_all_user_assets(&self, user_id: Uuid) -> anyhow::Result<Vec<AssetDto>> {
        let query = asset_queries::get_users_assets(user_id);
        let models = self.db.fetch_all::<PublicAsset>(query).await?;

        let ret_vec: Vec<AssetDto> = models
            .into_iter()
            .map(|val| AssetDto {
                ticker: val.ticker,
                name: val.asset_name,
                category: val.category,
                asset_id: val.id,
                owner: Some(user_id),
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
        let query = asset_queries::assets_count_by_ids_and_access(asset_ids, user_id);
        let models = self.db.fetch_one::<Count>(query).await?;
        if models.count != nums {
            return Err(anyhow::anyhow!(
                "Not all assets found or no permission fot them"
            ));
        }

        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_asset_pair_id(&self, pair1: i32, pair2: i32) -> anyhow::Result<i32> {
        let query = asset_queries::get_pair_id(pair1, pair2);
        let ret = self.db.fetch_one::<AssetPairId>(query).await?;
        Ok(ret.id)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn add_asset(&self, rate: AssetInsertDto) -> anyhow::Result<InsertAssetResultDto> {
        self.db.start_transaction().await?;
        let asset_id = self.insert_asset(rate.clone()).await?;
        if let Some(base_pair_id) = rate.base_pair_id {
            let pair = AssetPairInsertDto {
                pair1: asset_id,
                pair2: base_pair_id,
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

    #[tracing::instrument(skip_all, err)]
    pub async fn validate_asset_ownership(
        &self,
        user_id: Uuid,
        asset_id: i32,
    ) -> anyhow::Result<bool> {
        let query = asset_queries::asset_exists_by_id_and_user_id(asset_id, user_id);
        let ret = self.db.fetch_one::<Exsists>(query).await?;
        Ok(ret.exists)
    }

    #[tracing::instrument(skip_all, err)]
    async fn insert_asset(&self, asset_dto: AssetInsertDto) -> anyhow::Result<i32> {
        let query = asset_queries::insert_asset(asset_dto.clone().into());
        let asset_id = self.db.fetch_one::<AssetId>(query).await?;
        Ok(asset_id.id)
    }

    #[tracing::instrument(skip_all, err)]
    async fn insert_asset_pair(&self, pair_dto: AssetPairInsertDto) -> anyhow::Result<i32> {
        let query = asset_queries::inser_pair(pair_dto.into());
        let asset_pair_id = self.db.fetch_one::<AssetPairId>(query).await?;
        Ok(asset_pair_id.id)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_assets_base_pairs(
        &self,
        ids: HashSet<i32>,
    ) -> anyhow::Result<std::collections::HashMap<i32, i32>> {
        let query = asset_queries::get_assets_base_pair_ids(ids);
        let asset_base_pair_ids = self.db.fetch_all::<AssetBasePair>(query).await?;
        let mut base_pairs_map = std::collections::HashMap::new();
        for asset_base_pair in asset_base_pair_ids {
            base_pairs_map.insert(asset_base_pair.id, asset_base_pair.base_pair_id);
        }
        Ok(base_pairs_map)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn update_asset(&self, dto: UpdateAssetDto) -> anyhow::Result<()> {
        let query = asset_queries::update_asset(
            dto.asset_id,
            dto.name,
            dto.ticker,
            dto.asset_type,
            dto.base_pair_id,
            dto.user_id,
        );
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_asset_pair_user_metadata(
        &self,
        pair_id: i32,
    ) -> anyhow::Result<Option<String>> {
        let query = asset_queries::get_asset_pair_user_metadata(pair_id);
        let result = self
            .db
            .fetch_optional::<AssetPairUserMetadata>(query)
            .await?;
        Ok(result.and_then(|m| m.exchange))
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn upsert_asset_pair_user_metadata(
        &self,
        pair_id: i32,
        exchange: String,
    ) -> anyhow::Result<()> {
        let query = asset_queries::upsert_asset_pair_user_metadata(pair_id, exchange);
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn delete_asset(&self, user_id: Uuid, asset_id: i32) -> anyhow::Result<()> {
        let is_owned = self.validate_asset_ownership(user_id, asset_id).await?;
        if !is_owned {
            return Err(anyhow::anyhow!("Asset not owned by user"));
        }

        self.db.start_transaction().await?;

        let query = asset_queries::delete_asset_history_by_asset(asset_id);
        self.db.execute(query).await?;

        let query = asset_queries::delete_asset_pair_user_metadata_by_asset(asset_id);
        self.db.execute(query).await?;

        let query = asset_queries::delete_asset_pair_shared_metadata_by_asset(asset_id);
        self.db.execute(query).await?;

        let query = asset_queries::delete_asset_pairs_by_asset(asset_id);
        self.db.execute(query).await?;

        let query = asset_queries::delete_asset_by_id_and_user(asset_id, user_id);
        self.db.execute(query).await?;

        self.db.commit_transaction().await?;
        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn delete_asset_pair(
        &self,
        user_id: Uuid,
        pair1: i32,
        pair2: i32,
    ) -> anyhow::Result<()> {
        let is_owned = self.validate_asset_ownership(user_id, pair1).await?;
        if !is_owned {
            return Err(anyhow::anyhow!("Asset not owned by user"));
        }

        let pair_id = self.get_asset_pair_id(pair1, pair2).await?;

        self.db.start_transaction().await?;

        let query = asset_queries::delete_asset_pair_rates_by_pair_id(pair_id);
        self.db.execute(query).await?;

        let query = asset_queries::delete_asset_pair_user_metadata_by_pair_id(pair_id);
        self.db.execute(query).await?;

        let query = asset_queries::delete_asset_pair_shared_metadata_by_pair_id(pair_id);
        self.db.execute(query).await?;

        let query = asset_queries::delete_asset_pair_by_id(pair_id);
        self.db.execute(query).await?;

        self.db.commit_transaction().await?;
        Ok(())
    }
}
