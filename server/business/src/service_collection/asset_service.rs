use dal::{database_context::MyraDb, db_sets::asset_db_set::AssetDbSet};

use crate::dtos::asset_dto::AssetDto;

#[derive(Clone)]
pub struct AssetsService {
    db: MyraDb,
}

impl AssetsService {
    pub fn new(db_context: MyraDb) -> Self {
        Self { db: db_context }
    }

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

    pub async fn get_asset(&self, id: i32) -> anyhow::Result<AssetDto> {
        let model = self.db.get_connection().await?.get_asset(id).await?;

        Ok(model.into())
    }
}
