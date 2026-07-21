use crate::jobs::CronJob;
use async_trait::async_trait;
use business::service_collection::ServiceProviders;

pub struct RefreshOauthTokensJob;

#[async_trait]
impl CronJob for RefreshOauthTokensJob {
    const NAME: &'static str = "refresh_oauth_tokens";
    const SCHEDULE: &'static str = "0 */5 * * * *";

    #[tracing::instrument(level = "info", name = "refresh_oauth_tokens", skip_all)]
    async fn tick(_providers: &ServiceProviders) -> anyhow::Result<()> {
        tracing::info!("refreshing OAuth tokens");
        Ok(())
    }
}
