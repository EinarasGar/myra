use business::dtos::{
    asset_pair_rate_insert_dto::AssetPairRateInsertDto,
    asset_ticker_pair_ids_dto::AssetTickerPairIdsDto,
    assets::{asset_id_dto::AssetIdDto, asset_pair_ids_dto::AssetPairIdsDto},
};
use rust_decimal::{prelude::FromPrimitive, Decimal};
use yahoo::time::{Duration, OffsetDateTime};
use yahoo_finance_api::{self as yahoo};

use crate::{asset_rates_service, assets_service};

pub(super) async fn update_assets(skip_assets: bool, skip_currencies: bool, skip_crypto: bool) {
    if !skip_assets {
        update_asset_prices().await;
    }
    if !skip_currencies {
        update_currency_prices().await;
    }
    if !skip_crypto {
        update_cryptocurrency_prices().await;
    }
}

async fn get_assets() -> impl Iterator<Item = AssetTickerPairIdsDto> {
    assets_service()
        .get_all_assets_ticker_and_pair_ids()
        .await
        .unwrap()
        .into_iter()
}

async fn update_cryptocurrency_prices() {
    println!("Updating cryptocurrency prices...");

    let assets: Vec<AssetTickerPairIdsDto> = get_assets()
        .await
        .filter(|a| a.asset_type == 8 || a.asset_type == 1)
        .collect();

    let mut asset_pairs = Vec::new();

    for i in 0..assets.len() {
        for j in 0..assets.len() {
            if i != j {
                if assets[i].asset_type == 5 && assets[j].asset_type == 5 {
                    continue;
                }
                if assets[i].asset_type == 1 && assets[j].asset_type == 1 {
                    continue;
                }
                asset_pairs.push((assets[i].asset_id, assets[j].asset_id));
            }
        }
    }

    for permutation in asset_pairs {
        let pair_id = assets_service()
            .get_asset_pair_id(permutation.0, permutation.1)
            .await;

        let asset1 = assets.iter().find(|a| a.asset_id == permutation.0).unwrap();
        let asset2 = assets.iter().find(|a| a.asset_id == permutation.1).unwrap();

        if pair_id.is_ok() {
            let asset_rates = asset_rates_service()
                .get_pair_latest_direct(AssetPairIdsDto::new(
                    AssetIdDto(permutation.0),
                    AssetIdDto(permutation.1),
                ))
                .await
                .unwrap();

            let latest_date = asset_rates.map(|a| a.date);
            let ticker = format!("{}-{}", asset1.ticker, asset2.ticker);
            insert_quotes(latest_date, ticker, asset1.asset_id, asset2.asset_id).await;
        }
    }
}

async fn update_asset_prices() {
    println!("Updating asset prices...");
    let assets: Vec<AssetTickerPairIdsDto> = get_assets()
        .await
        .filter(|a| a.base_id.is_some())
        .filter(|a| a.asset_type == 5 || a.asset_type == 2)
        .collect();
    for asset in assets {
        let pair_id = assets_service()
            .get_asset_pair_id(asset.asset_id, asset.base_id.unwrap())
            .await;

        if pair_id.is_ok() {
            let asset_rates = asset_rates_service()
                .get_pair_latest_direct(AssetPairIdsDto::new(
                    AssetIdDto(asset.asset_id),
                    AssetIdDto(asset.base_id.unwrap()),
                ))
                .await
                .unwrap();

            let latest_date = asset_rates.map(|r| r.date);
            let ticker = asset.ticker;
            insert_quotes(latest_date, ticker, asset.asset_id, asset.base_id.unwrap()).await;
        }
    }
}

async fn update_currency_prices() {
    println!("Updating currency prices...");

    let assets: Vec<AssetTickerPairIdsDto> = get_assets()
        .await
        .filter(|a| a.asset_type == 1)
        .filter(|a| a.base_id.is_none())
        .collect();

    let mut asset_pairs = Vec::new();

    for i in 0..assets.len() {
        for j in 0..assets.len() {
            if i != j {
                asset_pairs.push((assets[i].asset_id, assets[j].asset_id));
            }
        }
    }

    for permutation in asset_pairs {
        let asset_rates = asset_rates_service()
            .get_pair_latest_direct(AssetPairIdsDto::new(
                AssetIdDto(permutation.0),
                AssetIdDto(permutation.1),
            ))
            .await
            .unwrap();

        let asset1 = assets.iter().find(|a| a.asset_id == permutation.0).unwrap();
        let asset2 = assets.iter().find(|a| a.asset_id == permutation.1).unwrap();

        let pair_id = assets_service()
            .get_asset_pair_id(asset1.asset_id, asset2.asset_id)
            .await;

        if pair_id.is_ok() {
            let latest_date = asset_rates.map(|r| r.date);
            let ticker = format!("{}{}=X", asset1.ticker, asset2.ticker);
            insert_quotes(latest_date, ticker, asset1.asset_id, asset2.asset_id).await;
        }
    }
}

pub(crate) async fn insert_quotes(
    latest_date: Option<OffsetDateTime>,
    ticker: String,
    pair_id1: i32,
    pair_id2: i32,
) {
    println!("Getting history for {:?} since {:?}", ticker, latest_date);
    let pair_id = assets_service()
        .get_asset_pair_id(pair_id1, pair_id2)
        .await
        .unwrap();

    let provider = yahoo::YahooConnector::new().unwrap();
    let start = if let Some(start_date) = latest_date {
        start_date.checked_add(Duration::days(1)).unwrap()
    } else {
        OffsetDateTime::from_unix_timestamp(0).unwrap()
    };

    let end = OffsetDateTime::now_utc();
    let resp = provider.get_quote_history(&ticker, start, end).await;
    if resp.is_err() {
        println!("Couldnt get history for {}", ticker);
        return;
    }
    let response = resp.unwrap();
    let is_pence = response
        .metadata()
        .ok()
        .and_then(|m| m.currency)
        .as_deref()
        == Some("GBp");
    if is_pence {
        println!("{} is denominated in pence (GBp), converting to GBP", ticker);
    }
    let quotes = match response.quotes() {
        Ok(quotes) => quotes,
        Err(_) => {
            println!("No quotes found for {}, skipping", ticker);
            return;
        }
    };

    for quote in quotes {
        let date =
            OffsetDateTime::from_unix_timestamp(quote.timestamp).unwrap();
        let price = if is_pence { quote.close / 100.0 } else { quote.close };
        asset_rates_service()
            .insert_pair_single(AssetPairRateInsertDto {
                pair_id,
                rate: Decimal::from_f64(price).unwrap(),
                date,
            })
            .await
            .unwrap();
        println!("{:?} {:?}", date, price);
    }
}
