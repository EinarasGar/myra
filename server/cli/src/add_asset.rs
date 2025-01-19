use crate::asset_update::insert_quotes;
use crate::assets_service;
use business::dtos::asset_insert_dto::AssetInsertDto;

pub(super) async fn add_asset(
    ticker: String,
    name: String,
    category: i32,
    base_pair_id: Option<i32>,
    initialize_base_pair: bool,
) {
    let insert_asset_dto = assets_service()
        .add_asset(AssetInsertDto {
            name,
            ticker: ticker.clone(),
            asset_type: category,
            base_pair_id,
            user_id: None,
        })
        .await
        .unwrap();

    if initialize_base_pair {
        insert_quotes(
            None,
            ticker,
            insert_asset_dto.new_asset_id,
            base_pair_id.unwrap(),
        )
        .await;
    }
}
