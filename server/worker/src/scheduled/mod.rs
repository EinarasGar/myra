pub mod category_stats;
pub mod refresh_assets;

use chrono::{DateTime, Utc};

#[derive(Default, Debug, Clone)]
pub struct CronTick(#[allow(dead_code)] DateTime<Utc>);

impl From<DateTime<Utc>> for CronTick {
    fn from(t: DateTime<Utc>) -> Self {
        Self(t)
    }
}

macro_rules! cron_worker {
    ($name:expr, $schedule:expr, $services:expr, $handler:expr) => {
        apalis::prelude::WorkerBuilder::new($name)
            .layer(apalis::layers::catch_panic::CatchPanicLayer::new())
            .data($services.clone())
            .backend(apalis_cron::CronStream::new(
                <apalis_cron::Schedule as std::str::FromStr>::from_str($schedule)
                    .expect("valid cron"),
            ))
            .build_fn($handler)
    };
}

pub(crate) use cron_worker;
