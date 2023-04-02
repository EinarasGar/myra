use dal::db_sets::asset_db_set::AssetsDbSet;

use crate::dtos::asset_dto::AssetDto;

#[derive(Clone)]
pub struct AssetsService {
    assets_db_set: AssetsDbSet,
}

impl AssetsService {
    pub fn new(assets_db_set: AssetsDbSet) -> Self {
        Self { assets_db_set }
    }

    pub async fn get_assets(
        &self,
        page: u64,
        search: Option<String>,
    ) -> anyhow::Result<Vec<AssetDto>> {
        let page_size = 20;
        let models = self
            .assets_db_set
            .get_assets(page_size, page, search)
            .await?;

        let mut ret_vec: Vec<AssetDto> = Vec::new();
        for model in models {
            ret_vec.push(model.into());
        }

        Ok(ret_vec)
    }

    pub async fn get_asset(&self, id: i32) -> anyhow::Result<AssetDto> {
        let model = self.assets_db_set.get_asset(id).await?;

        Ok(model.into())
    }
}
