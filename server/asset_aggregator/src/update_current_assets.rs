use business::{
    dtos::{
        asset_pair_rate_insert_dto::AssetPairRateInsertDto,
        assets::{asset_id_dto::AssetIdDto, asset_pair_ids_dto::AssetPairIdsDto},
    },
    service_collection::{
        asset_rates_service::AssetRatesService, asset_service::AssetsService, Services,
    },
};
use rust_decimal::{prelude::FromPrimitive, Decimal};
use yahoo::time::{Duration, OffsetDateTime};
use yahoo_finance_api as yahoo;

#[tokio::main]
async fn main() {
    let services = Services::new().await.unwrap();
    let asset_service = AssetsService::new(services.get_db_instance());
    let asset_rates_service = AssetRatesService::new(services.get_db_instance());
    let assets = asset_service
        .get_all_assets_ticker_and_pair_ids()
        .await
        .unwrap();
    for asset in assets {
        if asset.base_id.is_none() {
            continue;
        }
        let asset_rates = asset_rates_service
            .get_pair_latest_direct(AssetPairIdsDto::new(
                AssetIdDto(asset.asset_id),
                AssetIdDto(asset.base_id.unwrap()),
            ))
            .await
            .unwrap();

        let latest_date = asset_rates.unwrap().date;

        let provider = yahoo::YahooConnector::new().unwrap();
        let start = latest_date.checked_add(Duration::days(1)).unwrap();
        let end = OffsetDateTime::now_utc();

        let mut ticker = asset.ticker;

        if ticker == "DOT" {
            ticker = "DOT-EUR".to_string();
        } else if ticker == "ETH" {
            ticker = "ETH-EUR".to_string();
        } else if ticker == "EGLD" {
            ticker = "EGLD-EUR".to_string();
        };

        let resp = provider.get_quote_history(&ticker, start, end).await;
        if resp.is_err() {
            println!("Couldnt get history for {}", ticker);
            continue;
        }
        let quotes = resp.unwrap().quotes().unwrap();

        let pair_id = asset_service
            .get_asset_pair_id(asset.asset_id, asset.base_id.unwrap())
            .await
            .unwrap();

        for quote in quotes {
            let date =
                OffsetDateTime::from_unix_timestamp(quote.timestamp.try_into().unwrap()).unwrap();
            let price = quote.close;
            asset_rates_service
                .insert_pair_single(AssetPairRateInsertDto {
                    pair_id,
                    rate: Decimal::from_f64(price).unwrap(),
                    date,
                })
                .await
                .unwrap();
            println!("{:?} {:?}", date, price);
        }

        //println!("{} {:?}", asset.ticker, earliest_date);
    }
}
