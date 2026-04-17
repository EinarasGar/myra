use dal::database_connection::MyraDbConnection;
#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::file_provider::FileProvider;
use dal::job_queue::JobQueueHandle;
use dal::noop_file_provider::NoOpFileProvider;
use dal::redis_connection::RedisConnection;
use dal::s3_file_provider::S3FileProvider;
use std::sync::Arc;

use crate::jobs::MyraJob;
pub mod accounts_service;
pub mod ai_action_service;
pub mod ai_chat_service;
pub mod ai_data_service;
pub mod ai_embedding_service;
pub mod asset_rates_service;
pub mod asset_service;
pub mod auth_service;
pub mod category_service;
pub mod category_type_service;
pub mod category_validation_service;
pub mod entries_service;
pub mod file_service;
pub mod portfolio_overview_service;
pub mod portfolio_service;
pub mod transaction_group_service;
pub mod transaction_management_service;
pub mod transaction_metadata_service;
pub mod transaction_service;
pub mod user_service;

#[derive(Clone)]
pub struct Services {
    pub connection: MyraDbConnection,
    pub file_provider: Arc<dyn FileProvider>,
    pub redis: RedisConnection,
    pub job_queue: JobQueueHandle<MyraJob>,
}

#[derive(Clone)]
pub struct ServiceProviders {
    pub db: MyraDb,
    pub job_queue: JobQueueHandle<MyraJob>,
    pub file_provider: Arc<dyn FileProvider>,
    pub redis: RedisConnection,
    pub services: Services,
}

impl Services {
    pub async fn new() -> anyhow::Result<Self> {
        let connection = MyraDbConnection::new().await.unwrap();

        let file_provider: Arc<dyn FileProvider> = match S3FileProvider::new() {
            Ok(provider) => Arc::new(provider),
            Err(e) => {
                tracing::warn!(
                    "S3 file provider not configured, file uploads disabled: {}",
                    e
                );
                Arc::new(NoOpFileProvider)
            }
        };

        let redis = RedisConnection::new().await;
        let job_queue = JobQueueHandle::<MyraJob>::new(connection.pool.clone());

        Ok(Services {
            connection,
            file_provider,
            redis,
            job_queue,
        })
    }

    pub fn create_providers(&self) -> ServiceProviders {
        ServiceProviders {
            db: MyraDb::new(self.connection.clone()),
            job_queue: self.job_queue.clone(),
            file_provider: self.file_provider.clone(),
            redis: self.redis.clone(),
            services: self.clone(),
        }
    }

    pub fn get_job_queue_instance(&self) -> JobQueueHandle<MyraJob> {
        self.job_queue.clone()
    }
}
