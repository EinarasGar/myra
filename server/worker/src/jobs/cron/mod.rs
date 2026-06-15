pub mod generate_chat_titles;
pub mod refresh_assets;
pub mod seed_asset_history;

pub use generate_chat_titles::GenerateChatTitlesJob;
pub use refresh_assets::RefreshAssetsJob;
pub use seed_asset_history::SeedAssetHistoryJob;

use business::service_collection::asset_rates_service::AssetRatesService;
use dal::market_data_client::PairRequest;
use dal::models::asset_models::HeldAssetPairDetailModel;

const RESERVE_CURRENCIES: [&str; 5] = ["USD", "EUR", "GBP", "JPY", "CHF"];

pub(crate) async fn collect_market_pairs(
    rates_svc: &AssetRatesService,
    has_rates: bool,
) -> anyhow::Result<(Vec<HeldAssetPairDetailModel>, Vec<PairRequest>)> {
    let mut pairs = rates_svc.list_held_pair_details(has_rates).await?;
    pairs.extend(
        rates_svc
            .list_currency_cross_pairs(
                RESERVE_CURRENCIES.iter().map(|s| s.to_string()).collect(),
                has_rates,
            )
            .await?,
    );
    pairs.sort_by_key(|p| p.pair_id);
    pairs.dedup_by_key(|p| p.pair_id);
    let requests = pairs.iter().map(PairRequest::from).collect();
    Ok((pairs, requests))
}
