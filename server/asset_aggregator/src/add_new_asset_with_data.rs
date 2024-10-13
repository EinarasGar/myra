use business::{
    dtos::{asset_insert_dto::AssetInsertDto, asset_pair_rate_insert_dto::AssetPairRateInsertDto},
    service_collection::{asset_service::AssetsService, Services},
};
use rust_decimal::{prelude::FromPrimitive, Decimal};
use yahoo::time::{Duration, OffsetDateTime};
use yahoo_finance_api as yahoo;

#[tokio::main]
async fn main() {
    let asset_name = "Ethereum";
    let asset_ticker = "ETH";
    let asset_type = 2;
    let base_pair_id = Some(2);
    let ticker = "ETH-EUR";

    let services = Services::new().await.unwrap();
    let asset_service = AssetsService::new(services.get_db_instance());
    let kkkk = asset_service
        .add_asset(AssetInsertDto {
            name: asset_name.to_string(),
            ticker: asset_ticker.to_string(),
            asset_type,
            base_pair_id,
            user_id: None,
        })
        .await
        .unwrap();

    let provider = yahoo::YahooConnector::new().unwrap();
    let start = OffsetDateTime::from_unix_timestamp(0).unwrap();
    let end = OffsetDateTime::now_utc()
        .checked_add(Duration::hours(-24))
        .unwrap();
    let resp = provider
        .get_quote_history(ticker, start, end)
        .await
        .unwrap();
    let quotes = resp.quotes().unwrap();
    for quote in quotes {
        let date =
            OffsetDateTime::from_unix_timestamp(quote.timestamp.try_into().unwrap()).unwrap();
        let price = quote.close;
        asset_service
            .insert_asset_pair_rate(AssetPairRateInsertDto {
                pair_id: kkkk.new_asset_pair_id.unwrap(),
                rate: Decimal::from_f64(price).unwrap(),
                date,
            })
            .await
            .unwrap();
        println!("{:?} {:?}", date, price);
    }
}
