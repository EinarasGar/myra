use business::{
    dtos::asset_pair_rate_dto::AssetPairRateDto,
    service_collection::{asset_service::AssetsService, Services},
};
use rust_decimal::{prelude::FromPrimitive, Decimal};
use std::collections::HashSet;
use yahoo::time::{Duration, OffsetDateTime};
use yahoo_finance_api as yahoo;

#[tokio::main]
async fn main() {
    let services = Services::new().await.unwrap();
    let asset_service = AssetsService::new(services);
    let latest_rate = asset_service
        .get_asset_rates_default_latest(2, HashSet::from([4]))
        .await
        .unwrap()
        .values()
        .last()
        .unwrap()
        .to_owned();
    let provider = yahoo::YahooConnector::new();
    let start = latest_rate.date.checked_add(Duration::hours(24)).unwrap();
    let end = OffsetDateTime::now_utc()
        .checked_add(Duration::hours(-24))
        .unwrap();
    let resp = provider
        .get_quote_history("DOT-EUR", start, end)
        .await
        .unwrap();
    let quotes = resp.quotes().unwrap();
    for quote in quotes {
        let date =
            OffsetDateTime::from_unix_timestamp(quote.timestamp.try_into().unwrap()).unwrap();
        let price = quote.close;
        asset_service
            .add_asset_rate(AssetPairRateDto {
                asset1_id: 1,
                asset2_id: 1,
                rate: Decimal::from_f64(price).unwrap(),
                date: date,
            })
            .await
            .unwrap();
        println!("{:?} {:?}", date, price);
    }
}

#[tokio::test]
async fn new_asset() {
    let services = Services::new().await.unwrap();
    let asset_service = AssetsService::new(services);
    let provider = yahoo::YahooConnector::new();
    let start = OffsetDateTime::from_unix_timestamp(0).unwrap();
    let end = OffsetDateTime::now_utc()
        .checked_add(Duration::hours(-24))
        .unwrap();
    let resp = provider
        .get_quote_history("GBPEUR=X", start, end)
        .await
        .unwrap();
    let quotes = resp.quotes().unwrap();
    for quote in quotes {
        let date =
            OffsetDateTime::from_unix_timestamp(quote.timestamp.try_into().unwrap()).unwrap();
        let price = quote.close;
        asset_service
            .add_asset_rate(AssetPairRateDto {
                asset1_id: 1,
                asset2_id: 1,
                rate: Decimal::from_f64(price).unwrap(),
                date: date,
            })
            .await
            .unwrap();
        println!("{:?} {:?}", date, price);
    }
}
