use apalis::prelude::{BoxDynError, Data};
use business::dtos::asset_pair_rate_insert_dto::AssetPairRateInsertDto;
use business::service_collection::asset_rates_service::AssetRatesService;
use business::service_collection::Services;

use super::CronTick;
use dal::market_data_client::MarketDataClient;

#[tracing::instrument(name = "seed_asset_history", skip_all, err)]
pub async fn tick(_tick: CronTick, services: Data<Services>) -> Result<(), BoxDynError> {
    let providers = services.create_providers();
    let rates_svc = AssetRatesService::new(&providers);

    let (pairs, requests) = super::collect_market_pairs(&rates_svc, false).await?;

    if pairs.is_empty() {
        tracing::info!("All pairs already have history");
        return Ok(());
    }

    tracing::info!("Downloading history for {} pairs", requests.len());

    let response = MarketDataClient::new().get_history(&requests, None).await?;

    let mut all_inserts: Vec<AssetPairRateInsertDto> = Vec::new();

    for pair in &pairs {
        let Some(entry) = response
            .iter()
            .find(|e| e.base == pair.asset_ticker && e.quote == pair.base_ticker)
        else {
            tracing::warn!(
                "No history returned for {}/{}",
                pair.asset_ticker,
                pair.base_ticker
            );
            continue;
        };

        if entry.rates.is_empty() {
            tracing::warn!(
                "No rates for {}/{} (pair_id={})",
                pair.asset_ticker,
                pair.base_ticker,
                pair.pair_id
            );
        } else {
            tracing::info!(
                "{}/{} (pair_id={}): {} daily rates",
                pair.asset_ticker,
                pair.base_ticker,
                pair.pair_id,
                entry.rates.len()
            );
        }

        all_inserts.extend(entry.rates.iter().map(|rate_entry| AssetPairRateInsertDto {
            pair_id: pair.pair_id,
            rate: rate_entry.rate,
            date: rate_entry.recorded_at,
        }));
    }

    if all_inserts.is_empty() {
        tracing::info!("No rates to insert");
        return Ok(());
    }

    tracing::info!("Inserting {} total rates", all_inserts.len());
    rates_svc.insert_pair_many(all_inserts).await?;

    Ok(())
}
