use std::collections::{HashMap, HashSet, VecDeque};

use dal::{
    models::{
        asset_models::{Asset, AssetId, AssetPairId, AssetRaw, AssetWithMetadata, PublicAsset},
        asset_pair::AssetPair,
        asset_pair_rate::AssetPairRate,
        asset_pair_rate_option::AssetPairRateOption,
        asset_pair_shared_metadta::AssetPairSharedMetadata,
        asset_rate::AssetRate,
        count::Count,
        exists::Exsists,
        total_count_model::TotalCount,
    },
    queries::{self, asset_queries},
    query_params::get_assets_params::GetAssetsParams,
};

#[mockall_double::double]
use dal::database_context::MyraDb;

use mockall::automock;
use time::OffsetDateTime;
use tracing::error;
use uuid::Uuid;

use crate::dtos::{
    self,
    add_custom_asset_dto::AddCustomAssetDto,
    asset_dto::AssetDto,
    asset_id_date_dto::AssetIdDateDto,
    asset_insert_dto::AssetInsertDto,
    asset_insert_result_dto::InsertAssetResultDto,
    asset_pair_date_dto::AssetPairDateDto,
    asset_pair_insert_dto::AssetPairInsertDto,
    asset_pair_rate_dto::AssetPairRateDto,
    asset_pair_rate_insert_dto::AssetPairRateInsertDto,
    asset_rate_dto::AssetRateDto,
    asset_ticker_pair_ids_dto::AssetTickerPairIdsDto,
    assets::{
        asset_dto, full_asset_dto::FullAssetDto,
        shared_asset_pair_metadata_dto::SharedAssetPairMetadataDto,
    },
    page_of_results_dto::PageOfResultsDto,
    paging_dto::PagingDto,
};

use super::asset_rates_service::AssetRatesService;

pub struct AssetsService {
    db: MyraDb,
    transaction_service: AssetRatesService,
}

#[automock]
impl AssetsService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            transaction_service: AssetRatesService::new(db.clone()),
            db,
        }
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
                name: val.name,
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
    pub async fn get_assets_rates_default_from_date(
        &self,
        default_asset_id: i32,
        asset_ids: HashSet<i32>,
        start_time: Option<OffsetDateTime>,
    ) -> anyhow::Result<HashMap<(i32, i32), VecDeque<AssetRateDto>>> {
        let mut result: HashMap<(i32, i32), VecDeque<AssetRateDto>> = HashMap::new();

        let query = asset_queries::get_latest_asset_pair_rates(
            asset_ids
                .into_iter()
                .map(|x| AssetPair {
                    pair1: x,
                    pair2: default_asset_id,
                })
                .collect(),
            start_time,
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
            let query = asset_queries::get_latest_asset_pair_rates(
                non_default_rates_pair1_ids
                    .into_iter()
                    .map(|x| AssetPair {
                        pair1: x,
                        pair2: default_asset_id,
                    })
                    .collect(),
                start_time,
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
        let query = asset_queries::get_pair_rates(pair1, pair2);
        let ret = self.db.fetch_all::<AssetRate>(query).await?;

        let result: Vec<AssetRateDto> = ret.into_iter().map(|x| x.into()).collect();

        Ok(result)
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
    pub async fn get_asset_refrence_price_by_dates(
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
