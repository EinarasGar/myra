use business::{
    dtos::asset_pair_rate_insert_dto::AssetPairRateInsertDto,
    service_collection::{asset_rates_service::AssetRatesService, Services},
};
use rust_decimal::{prelude::FromPrimitive, Decimal};
use yahoo::time::{Duration, OffsetDateTime};
use yahoo_finance_api as yahoo;

#[tokio::main]
async fn main() {
    let ticker = "GBPEUR=X";
    let asset_pair_id = 4;

    let services = Services::new().await.unwrap();
    let asset_rates_service = AssetRatesService::new(services.get_db_instance());
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
        asset_rates_service
            .insert_pair_single(AssetPairRateInsertDto {
                pair_id: asset_pair_id,
                rate: Decimal::from_f64(price).unwrap(),
                date,
            })
            .await
            .unwrap();
        println!("{:?} {:?}", date, price);
    }
}
