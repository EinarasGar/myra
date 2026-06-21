use async_trait::async_trait;
use std::fmt::Debug;
use thiserror::Error;
use tokio::task::JoinSet;
use tracing::{info, Instrument};

use crate::dynamic_enums;

#[derive(Error, Debug, PartialEq)]
pub enum LoaderError {
    #[error("Failed to load.")]
    FailedToLoad,

    #[error("Database Connection Error.")]
    DatabaseConnectionError,

    #[error("Database Query Error.")]
    DatabaseQueryError,

    #[error("Length missmatch. Expected {0}, loaded {1}.")]
    LengthMissmatch(usize, usize),
}

#[async_trait]
pub trait Loader: Debug {
    async fn load(&self) -> Result<(), LoaderError>;
    fn get_expected_len(&self) -> usize;
    fn get_loaded_len(&self) -> usize;
}

pub struct StartupLoader {
    loaders: Vec<Box<dyn Loader + Send + Sync>>,
}

impl StartupLoader {
    pub fn new() -> Self {
        Self {
            loaders: Vec::new(),
        }
    }

    pub fn register(&mut self, loader: Box<dyn Loader + Send + Sync>) {
        self.loaders.push(loader);
    }

    pub fn register_many(&mut self, loaders: Vec<Box<dyn Loader + Send + Sync>>) {
        for loader in loaders {
            self.register(loader);
        }
    }

    #[tracing::instrument(level = "info", skip_all)]
    pub async fn load(mut self) -> Result<(), LoaderError> {
        info!("Executing startup loaders.");

        let mut set = JoinSet::new();

        // Spawn all loaders into async tasks
        while let Some(loader) = self.loaders.pop() {
            set.spawn((async move { (loader.load().await, loader) }).in_current_span());
        }

        // Await the spawned tasks and abort on the first error
        while let Some(res) = set.join_next().await {
            match res {
                Ok((Ok(_), loader)) => {
                    info!(loader = ?loader, "loader executed successfully");

                    // I dont actually like this tbh. I think it should be located inside loaders themselves
                    // because some of them might not know what they are loading and how many items they should load
                    // additionally, the error handling is a mess now
                    // but I will leave it as is for now, as this is something I wanted to do to learn about traits n stuff
                    let loaded_len = loader.get_loaded_len();
                    let expected_len = loader.get_expected_len();
                    if loaded_len != expected_len {
                        tracing::error!(
                            loader = ?loader,
                            expected = expected_len,
                            loaded = loaded_len,
                            error.type = "LengthMissmatch",
                            "loader length mismatch"
                        );
                        return Err(LoaderError::LengthMissmatch(expected_len, loaded_len));
                    }
                }
                Ok((Err(e), loader)) => {
                    tracing::error!(
                        loader = ?loader,
                        error = &e as &dyn std::error::Error,
                        error.type = "LoaderError",
                        "loader failed"
                    );
                    return Err(e);
                }
                Err(join_error) => {
                    tracing::error!(
                        error = &join_error as &dyn std::error::Error,
                        error.type = "JoinError",
                        "loader task panicked or was aborted"
                    );
                    return Err(LoaderError::FailedToLoad);
                }
            }
        }

        Ok(())
    }

    pub async fn load_all() -> Result<(), LoaderError> {
        Self::default().load().await
    }
}

impl Default for StartupLoader {
    fn default() -> Self {
        info!("Initializing startup loaders.");
        let mut loader = Self::new();
        loader.register_many(dynamic_enums::get_all_dynamic_enum_loaders());
        loader
    }
}
