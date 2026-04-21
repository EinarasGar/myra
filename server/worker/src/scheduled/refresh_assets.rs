use apalis::prelude::{BoxDynError, Data};
use business::dtos::asset_pair_rate_insert_dto::AssetPairRateInsertDto;
use business::service_collection::asset_rates_service::AssetRatesService;
use business::service_collection::Services;
use time::OffsetDateTime;

use super::CronTick;
use crate::models::market_data::MarketDataClient;

#[tracing::instrument(name = "refresh_assets", skip_all, err)]
pub async fn tick(_tick: CronTick, services: Data<Services>) -> Result<(), BoxDynError> {
    let providers = services.create_providers();
    let rates_svc = AssetRatesService::new(&providers);

    let asset_pairs = rates_svc.list_held_pair_details(true).await?;
    let currency_pairs = rates_svc
        .list_currency_cross_pairs(
            vec![
                "USD".into(),
                "EUR".into(),
                "GBP".into(),
                "JPY".into(),
                "CHF".into(),
            ],
            true,
        )
        .await?;

    let mut symbols: Vec<(i32, String)> = Vec::new();

    for pair in &asset_pairs {
        symbols.push((pair.pair_id, pair.asset_ticker.clone()));
    }

    for pair in &currency_pairs {
        symbols.push((
            pair.pair_id,
            format!("{}{}", pair.asset_ticker, pair.base_ticker),
        ));
    }

    if symbols.is_empty() {
        tracing::info!("No pairs to refresh");
        return Ok(());
    }

    let symbol_list: Vec<&str> = symbols.iter().map(|(_, s)| s.as_str()).collect();
    tracing::info!("Fetching latest rates for: {}", symbol_list.join(", "));

    let response = MarketDataClient::new().get_latest(&symbol_list).await?;

    let now = OffsetDateTime::now_utc();
    let recorded_at = now.replace_time(time::Time::from_hms(now.hour(), now.minute(), 0)?);

    let mut inserts: Vec<AssetPairRateInsertDto> = Vec::new();

    for (pair_id, symbol) in &symbols {
        let Some(entry) = response.iter().find(|e| e.symbol == *symbol) else {
            tracing::warn!("No rate returned for {}", symbol);
            continue;
        };

        tracing::info!("pair_id={} rate={:.4} ({})", pair_id, entry.rate, symbol);
        inserts.push(AssetPairRateInsertDto {
            pair_id: *pair_id,
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
