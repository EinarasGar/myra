use crate::asset_update::insert_quotes;
use crate::{assets_service, embedding_service};
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
            name: name.clone(),
            ticker: ticker.clone(),
            asset_type: category,
            base_pair_id,
            user_id: None,
        })
        .await
        .unwrap();

    let embed_text = format!("Asset: {} | Ticker: {}", name, ticker);
    if let Err(e) = embedding_service()
        .embed_asset(insert_asset_dto.new_asset_id, &embed_text)
        .await
    {
        eprintln!("Failed to embed asset: {}", e);
    }

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
