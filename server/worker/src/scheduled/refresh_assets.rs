use apalis::prelude::{BoxDynError, Data};
use business::service_collection::asset_rates_service::AssetRatesService;
use business::service_collection::Services;

use super::CronTick;

#[tracing::instrument(skip_all)]
pub async fn tick(_tick: CronTick, services: Data<Services>) -> Result<(), BoxDynError> {
    let providers = services.create_providers();
    let svc = AssetRatesService::new(&providers);
    let pairs = svc.list_held_pairs().await?;

    if pairs.is_empty() {
        tracing::info!("Refreshing assets: (none held)");
        return Ok(());
    }

    let pairs_str = pairs
        .iter()
        .map(|p| match &p.exchange {
            Some(ex) => format!("{}.{}", p.ticker, ex),
            None => p.ticker.clone(),
        })
        .collect::<Vec<_>>()
        .join(", ");

    tracing::info!("Refreshing assets: {}", pairs_str);
    Ok(())
}
