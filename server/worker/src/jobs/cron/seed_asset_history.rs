use async_trait::async_trait;
use business::dtos::asset_pair_rate_insert_dto::AssetPairRateInsertDto;
use business::service_collection::asset_rates_service::AssetRatesService;
use business::service_collection::ServiceProviders;
use dal::market_data_client::MarketDataClient;

use crate::jobs::cron::collect_market_pairs;
use crate::jobs::CronJob;

pub struct SeedAssetHistoryJob;

#[async_trait]
impl CronJob for SeedAssetHistoryJob {
    const NAME: &'static str = "seed-asset-history";
    const SCHEDULE: &'static str = "0 * * * * *";

    #[tracing::instrument(name = "seed_asset_history", skip_all, err)]
    async fn tick(providers: &ServiceProviders) -> anyhow::Result<()> {
        let rates_svc = AssetRatesService::new(providers);

        let (pairs, requests) = collect_market_pairs(&rates_svc, false).await?;

        if pairs.is_empty() {
            tracing::info!("All pairs already have history");
            return Ok(());
        }

        tracing::info!("Downloading history for {} pairs", requests.len());

        let response = MarketDataClient::new()
            .get_history(&requests, None)
            .await
            .map_err(anyhow::Error::msg)?;

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
}
