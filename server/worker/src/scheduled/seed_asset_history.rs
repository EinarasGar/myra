use apalis::prelude::{BoxDynError, Data};
use business::dtos::asset_pair_rate_insert_dto::AssetPairRateInsertDto;
use business::service_collection::asset_rates_service::AssetRatesService;
use business::service_collection::Services;
use time::OffsetDateTime;

use super::CronTick;
use crate::models::market_data::MarketDataClient;

#[tracing::instrument(name = "seed_asset_history", skip_all, err)]
pub async fn tick(_tick: CronTick, services: Data<Services>) -> Result<(), BoxDynError> {
    let providers = services.create_providers();
    let rates_svc = AssetRatesService::new(&providers);

    let asset_pairs = rates_svc.list_held_pair_details(false).await?;
    let currency_pairs = rates_svc
        .list_currency_cross_pairs(
            vec![
                "USD".into(),
                "EUR".into(),
                "GBP".into(),
                "JPY".into(),
                "CHF".into(),
            ],
            false,
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
        tracing::info!("All pairs already have history");
        return Ok(());
    }

    let symbol_list: Vec<&str> = symbols.iter().map(|(_, s)| s.as_str()).collect();
    tracing::info!(
        "Downloading history for {} symbols: {}",
        symbol_list.len(),
        symbol_list.join(", ")
    );

    let response = MarketDataClient::new().get_history(&symbol_list).await?;

    let mut all_inserts: Vec<AssetPairRateInsertDto> = Vec::new();

    for (pair_id, symbol) in &symbols {
        let Some(entry) = response.iter().find(|e| e.symbol == *symbol) else {
            tracing::warn!("No history returned for {}", symbol);
            continue;
        };

        let mut count = 0;
        for rate_entry in &entry.rates {
            let Ok(ts) = chrono::DateTime::parse_from_rfc3339(&rate_entry.timestamp) else {
                continue;
            };
            let Some(recorded_at) = OffsetDateTime::from_unix_timestamp(ts.timestamp()).ok() else {
                continue;
            };
            all_inserts.push(AssetPairRateInsertDto {
                pair_id: *pair_id,
                rate: rate_entry.rate,
                date: recorded_at,
            });
            count += 1;
        }

        if count == 0 {
            tracing::warn!("No rates for {} (pair_id={})", symbol, pair_id);
        } else {
            tracing::info!("{} (pair_id={}): {} daily rates", symbol, pair_id, count);
        }
    }

    if all_inserts.is_empty() {
        tracing::info!("No rates to insert");
        return Ok(());
    }

    tracing::info!("Inserting {} total rates", all_inserts.len());
    rates_svc.insert_pair_many(all_inserts).await?;

    Ok(())
}
