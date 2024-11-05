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

    #[tracing::instrument(skip_all, err)]
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
                    info!("{:?} loader executed successfully.", loader);

                    // I dont actually like this tbh. I think it should be located inside loaders themselves
                    // because some of them might not know what they are loading and how many items they should load
                    // additionally, the error handling is a mess now
                    // but I will leave it as is for now, as this is something I wanted to do to learn about traits n stuff
                    let loaded_len = loader.get_loaded_len();
                    let expected_len = loader.get_expected_len();
                    if loaded_len != expected_len {
                        return Err(LoaderError::LengthMissmatch(expected_len, loaded_len));
                    }
                }
                Ok((Err(e), loader)) => {
                    tracing::error!("Loader {:?} failed: {:?}", loader, e);
                    // Abort the remaining tasks by returning early with the error
                    return Err(e);
                }
                Err(join_error) => {
                    tracing::error!("Loader Task panicked or was aborted: {:?}", join_error);
                    // Handle task panic or abortion
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
