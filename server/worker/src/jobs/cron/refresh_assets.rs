use async_trait::async_trait;
use business::dtos::asset_pair_rate_insert_dto::AssetPairRateInsertDto;
use business::service_collection::asset_rates_service::AssetRatesService;
use business::service_collection::ServiceProviders;
use dal::market_data_client::MarketDataClient;
use time::OffsetDateTime;

use crate::jobs::cron::collect_market_pairs;
use crate::jobs::CronJob;

pub struct RefreshAssetsJob;

#[async_trait]
impl CronJob for RefreshAssetsJob {
    const NAME: &'static str = "refresh-assets";
    const SCHEDULE: &'static str = "0 */5 * * * *";

    #[tracing::instrument(name = "refresh_assets", skip_all, err)]
    async fn tick(providers: &ServiceProviders) -> anyhow::Result<()> {
        let rates_svc = AssetRatesService::new(providers);

        let (pairs, requests) = collect_market_pairs(&rates_svc, true).await?;

        if pairs.is_empty() {
            tracing::info!("No pairs to refresh");
            return Ok(());
        }

        tracing::info!("Fetching latest rates for {} pairs", requests.len());

        let response = MarketDataClient::new()
            .get_latest(&requests)
            .await
            .map_err(anyhow::Error::msg)?;

        let now = OffsetDateTime::now_utc();
        let recorded_at = now.replace_time(time::Time::from_hms(now.hour(), now.minute(), 0)?);

        let mut inserts: Vec<AssetPairRateInsertDto> = Vec::new();

        for pair in &pairs {
            let Some(entry) = response
                .iter()
                .find(|e| e.base == pair.asset_ticker && e.quote == pair.base_ticker)
            else {
                tracing::warn!(
                    "No rate returned for {}/{}",
                    pair.asset_ticker,
                    pair.base_ticker
                );
                continue;
            };

            tracing::info!(
                "pair_id={} rate={:.4} ({}/{})",
                pair.pair_id,
                entry.rate,
                pair.asset_ticker,
                pair.base_ticker
            );
            inserts.push(AssetPairRateInsertDto {
                pair_id: pair.pair_id,
                rate: entry.rate,
                date: recorded_at,
            });
        }

        if inserts.is_empty() {
            tracing::info!("No prices to write");
            return Ok(());
        }

        let count = inserts.len();
        rates_svc.insert_pair_many(inserts).await?;
        tracing::info!("Wrote {} prices to asset_history", count);

        Ok(())
    }
}
