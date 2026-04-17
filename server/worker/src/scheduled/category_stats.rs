use apalis::prelude::{BoxDynError, Data};
use business::service_collection::category_service::CategoryService;
use business::service_collection::Services;

use super::CronTick;

#[tracing::instrument(skip_all)]
pub async fn tick(_tick: CronTick, services: Data<Services>) -> Result<(), BoxDynError> {
    let providers = services.create_providers();
    let svc = CategoryService::new(&providers);
    let categories = svc.search_categories(0, 1, None, None).await?;
    tracing::info!("Category count: {}", categories.total_results);
    Ok(())
}
