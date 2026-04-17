use crate::asset_update::insert_quotes;
use crate::{assets_service, embedding_service};
use ai::config::AiConfig;
use ai::embedding::embed_text;
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

    let text = format!("Asset: {} | Ticker: {}", name, ticker);
    match AiConfig::try_from_env() {
        Ok(config) => match embed_text(&config, &text).await {
            Ok(vec_f64) => {
                let embedding: Vec<f32> = vec_f64.iter().map(|&x| x as f32).collect();
                if let Err(e) = embedding_service()
                    .store_asset_embedding(insert_asset_dto.new_asset_id, embedding)
                    .await
                {
                    eprintln!("Failed to store asset embedding: {}", e);
                }
            }
            Err(e) => eprintln!("Failed to generate asset embedding: {}", e),
        },
        Err(e) => eprintln!("AI not configured, skipping embedding: {}", e),
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
