pub mod cron;
pub mod embeddings;
pub mod file_processing;
pub mod quick_upload;

use std::panic::AssertUnwindSafe;
use std::str::FromStr;

use ai::models::error::AiError;
use apalis::prelude::*;
use apalis_cron::CronStream;
use apalis_postgres::{Config, PostgresStorage};
use business::service_collection::{ServiceProviders, Services};
use futures::FutureExt;
use serde::{de::DeserializeOwned, Serialize};

use crate::retry::{self, RetryDecision, RetryPolicy};

#[async_trait::async_trait]
pub trait WorkerJob: Serialize + DeserializeOwned + Send + Sync + Unpin + Sized + 'static {
    const NAME: &'static str;

    async fn run(&self, providers: &ServiceProviders) -> anyhow::Result<()>;

    fn retry_policy() -> RetryPolicy {
        RetryPolicy::standard()
    }

    fn decide(error: &anyhow::Error, attempts: i32) -> RetryDecision {
        retry::default_decision(error, attempts, &Self::retry_policy())
    }

    async fn before_run(&self, _providers: &ServiceProviders) -> anyhow::Result<()> {
        Ok(())
    }

    async fn on_failure(
        &self,
        _providers: &ServiceProviders,
        _decision: &RetryDecision,
        _error: &AiError,
    ) {
    }
}

#[async_trait::async_trait]
pub trait CronJob: Send + Sync + Sized + 'static {
    const NAME: &'static str;
    const SCHEDULE: &'static str;

    async fn tick(providers: &ServiceProviders) -> anyhow::Result<()>;
}

#[tracing::instrument(level = "info", skip_all, fields(job = T::NAME, attempt = attempt.current(), otel.kind = "consumer"))]
pub async fn run_job<T: WorkerJob>(
    job: T,
    services: Data<Services>,
    attempt: Attempt,
) -> Result<(), BoxDynError> {
    let providers = services.create_providers();
    let attempts = attempt.current() as i32;
    let started = std::time::Instant::now();

    let result = AssertUnwindSafe(async {
        job.before_run(&providers).await?;
        job.run(&providers).await
    })
    .catch_unwind()
    .await
    .unwrap_or_else(panic_to_anyhow);

    let error = match result {
        Ok(()) => {
            tracing::info!(
                job = T::NAME,
                attempts,
                duration_ms = started.elapsed().as_millis() as u64,
                "job completed"
            );
            return Ok(());
        }
        Err(e) => e,
    };

    let decision = T::decide(&error, attempts);
    let ai_error = retry::extract_ai_error(&error);
    match &decision {
        RetryDecision::RetryAfter(delay) => {
            tracing::warn!(job = T::NAME, attempts, retry_in = ?delay, duration_ms = started.elapsed().as_millis() as u64, error = ?error, "job failed, retry scheduled");
        }
        RetryDecision::Abort => {
            tracing::error!(job = T::NAME, attempts, duration_ms = started.elapsed().as_millis() as u64, error = ?error, "job failed permanently");
        }
    }

    job.on_failure(&providers, &decision, &ai_error).await;
    Err(decision.into_apalis_error(ai_error))
}

#[tracing::instrument(level = "info", skip_all, fields(job = T::NAME, otel.kind = "consumer"), err)]
async fn cron_handler<T: CronJob>(
    _tick: apalis_cron::Tick,
    services: Data<Services>,
) -> Result<(), BoxDynError> {
    let started = std::time::Instant::now();
    T::tick(&services.create_providers()).await?;
    tracing::info!(
        job = T::NAME,
        duration_ms = started.elapsed().as_millis() as u64,
        "cron job completed"
    );
    Ok(())
}

fn panic_to_anyhow(panic: Box<dyn std::any::Any + Send>) -> anyhow::Result<()> {
    let msg = panic
        .downcast_ref::<&str>()
        .map(|s| s.to_string())
        .or_else(|| panic.downcast_ref::<String>().cloned())
        .unwrap_or_else(|| "non-string panic payload".to_string());
    Err(anyhow::anyhow!("panic in job: {msg}"))
}

pub trait MonitorExt {
    fn register_job<T: WorkerJob>(self, services: &Services) -> Self;
    fn register_cron<T: CronJob>(self, services: &Services) -> Self;
}

impl MonitorExt for Monitor {
    fn register_job<T: WorkerJob>(self, services: &Services) -> Self {
        let pool = services.connection.pool.clone();
        let queue = Config::new(std::any::type_name::<T>());
        let services = services.clone();
        self.register(move |_: usize| {
            WorkerBuilder::new(T::NAME)
                .backend(PostgresStorage::<T>::new_with_notify(&pool, &queue))
                .catch_panic()
                .enable_tracing()
                .data(services.clone())
                .build(run_job::<T>)
        })
    }

    fn register_cron<T: CronJob>(self, services: &Services) -> Self {
        let schedule = ::cron::Schedule::from_str(T::SCHEDULE).expect("valid cron schedule");
        let services = services.clone();
        self.register(move |_: usize| {
            WorkerBuilder::new(T::NAME)
                .backend(CronStream::new(schedule.clone()))
                .catch_panic()
                .data(services.clone())
                .build(cron_handler::<T>)
        })
    }
}
