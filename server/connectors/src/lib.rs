pub mod client_supplied;
pub mod dedup;
pub mod models;
pub mod port;
pub mod provider;
pub mod trading212;
pub mod truelayer;
mod util;

pub type Result<T> = std::result::Result<T, anyhow::Error>;
