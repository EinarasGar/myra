mod add_asset;
mod asset_update;

use asset_update::update_assets;

use business::service_collection::{
    asset_rates_service::AssetRatesService, asset_service::AssetsService, Services,
};
use clap::{Parser, Subcommand};
use tokio::sync::OnceCell;

#[derive(Parser)]
#[command(version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    UpdateAssets {
        /// Do not update asset prices
        #[arg(long)]
        skip_assets: bool,

        /// Do not update currency prices
        #[arg(long)]
        skip_currencies: bool,

        /// Do not update cryptocurrency prices
        #[arg(long)]
        skip_crypto: bool,
    },
    AddAsset {
        #[arg(short, long, required = true)]
        ticker: String,

        #[arg(short, long, required = true)]
        name: String,

        #[arg(short, long, required = true)]
        category: i32,

        #[arg(short, long)]
        base_pair: Option<i32>,

        #[arg(short, long, requires = "base_pair")]
        initialize_base_pair: bool,
    },
}

static ASSET_SERVICE: OnceCell<AssetsService> = OnceCell::const_new();
static ASSET_RATES_SERVICE: OnceCell<AssetRatesService> = OnceCell::const_new();

fn assets_service() -> &'static AssetsService {
    ASSET_SERVICE.get().unwrap()
}

fn asset_rates_service() -> &'static AssetRatesService {
    ASSET_RATES_SERVICE.get().unwrap()
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let services = Services::new().await.unwrap();

    if ASSET_SERVICE
        .set(AssetsService::new(services.get_db_instance()))
        .is_err()
    {
        eprintln!("Failed to set ASSET_SERVICE");
        return;
    }
    if ASSET_RATES_SERVICE
        .set(AssetRatesService::new(services.get_db_instance()))
        .is_err()
    {
        eprintln!("Failed to set ASSET_SERVICE");
        return;
    }

    match cli.command {
        Some(subcommand) => match subcommand {
            Commands::UpdateAssets {
                skip_assets,
                skip_currencies,
                skip_crypto,
            } => {
                update_assets(skip_assets, skip_currencies, skip_crypto).await;
            }
            Commands::AddAsset {
                ticker,
                name,
                category,
                base_pair,
                initialize_base_pair,
            } => {
                add_asset::add_asset(ticker, name, category, base_pair, initialize_base_pair).await;
            }
        },
        None => {}
    }
}
