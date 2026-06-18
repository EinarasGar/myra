use std::collections::HashMap;

use rust_decimal::prelude::ToPrimitive;
use shared::view_models::assets::add_asset::{AddAssetRequestViewModel, AddAssetResponseViewModel};
use shared::view_models::assets::add_asset_pair::AddAssetPairRequestViewModel;
use shared::view_models::assets::add_asset_pair_rates::AddAssetPairRatesRequestViewModel;
use shared::view_models::assets::base_models::asset::AssetViewModel;
use shared::view_models::assets::base_models::asset_id::RequiredAssetId;
use shared::view_models::assets::base_models::asset_name::AssetName;
use shared::view_models::assets::base_models::asset_ticker::AssetTicker;
use shared::view_models::assets::base_models::asset_type_id::RequiredAssetTypeId;
use shared::view_models::assets::base_models::lookup::AssetLookupTables;
use shared::view_models::assets::base_models::positive_rate::PositiveRate;
use shared::view_models::assets::base_models::rate::AssetRateViewModel;
use shared::view_models::assets::get_asset::GetAssetResponseViewModel;
use shared::view_models::assets::get_asset_pair::GetAssetPairResponseViewModel;
use shared::view_models::assets::get_asset_types::GetAssetTypesResponseViewModel;
use shared::view_models::assets::get_assets::GetAssetsLineResponseViewModel;
use shared::view_models::assets::get_user_asset_pair::GetUserAssetPairResponseViewModel;
use shared::view_models::assets::get_user_assets::GetUserAssetsResponseViewModel;
use shared::view_models::base_models::search::AssetsPage;
use time::OffsetDateTime;

use crate::error::ApiError;
use crate::models::{
    AssetDetail, AssetItem, AssetPairDetail, AssetPairRef, AssetSearchPage, AssetSummary,
    AssetTypeOption,
};

pub fn extract_assets(body: &str) -> Result<Vec<AssetItem>, String> {
    let page: AssetsPage = serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(page
        .results
        .into_iter()
        .map(|row| AssetItem {
            id: row.asset.asset_id.0,
            name: row.asset.asset.name.into_inner(),
            ticker: row.asset.asset.ticker.into_inner(),
        })
        .collect())
}

pub fn extract_asset_base_pair(body: &str) -> Result<(i32, String), String> {
    let resp: GetAssetResponseViewModel = serde_json::from_str(body).map_err(|e| e.to_string())?;
    resp.metadata
        .base_asset
        .map(|b| (b.asset_id.0, b.ticker))
        .ok_or_else(|| "asset has no base pair".to_string())
}

/// Global asset tickers embed the exchange as a dot suffix (EODHD style: `AAPL.NASDAQ`,
/// `0P0001OMXU.AS`). Split at the LAST dot so the UI can show the bare symbol and demote
/// the exchange to metadata. Currency/crypto tickers have no dot and pass through.
pub fn split_ticker_exchange(ticker: &str) -> (String, Option<String>) {
    match ticker.rsplit_once('.') {
        Some((symbol, exchange)) if !symbol.is_empty() && !exchange.is_empty() => {
            (symbol.to_string(), Some(exchange.to_string()))
        }
        _ => (ticker.to_string(), None),
    }
}

fn to_summaries(
    results: Vec<GetAssetsLineResponseViewModel>,
    lookup_tables: &AssetLookupTables,
) -> Vec<AssetSummary> {
    let type_names: HashMap<i32, String> = lookup_tables
        .asset_types
        .iter()
        .map(|t| (t.id.0, t.name.clone()))
        .collect();
    results
        .into_iter()
        .map(|row| AssetSummary {
            id: row.asset.asset_id.0,
            ticker: row.asset.asset.ticker.into_inner(),
            name: row.asset.asset.name.into_inner(),
            asset_type: type_names
                .get(&row.asset.asset.asset_type.0)
                .cloned()
                .unwrap_or_default(),
        })
        .collect()
}

pub fn extract_asset_search_page(body: &str) -> Result<AssetSearchPage, String> {
    let page: AssetsPage = serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(AssetSearchPage {
        items: to_summaries(page.results, &page.lookup_tables),
        total: page.total_results,
    })
}

pub fn extract_asset_detail(body: &str, user_asset: bool) -> Result<AssetDetail, String> {
    let resp: GetAssetResponseViewModel = serde_json::from_str(body).map_err(|e| e.to_string())?;
    let pairs = resp
        .metadata
        .pairs
        .into_iter()
        .map(|p| AssetPairRef {
            asset_id: p.asset_id.0,
            ticker: p.ticker,
            name: p.name,
        })
        .collect();
    let ticker = resp.asset.ticker.into_inner();
    let (display_symbol, exchange) = if user_asset {
        (ticker.clone(), None)
    } else {
        split_ticker_exchange(&ticker)
    };
    Ok(AssetDetail {
        ticker,
        display_symbol,
        exchange,
        name: resp.asset.name.into_inner(),
        asset_type: resp.asset.asset_type.name,
        base_pair_id: resp.metadata.base_asset.map(|b| b.asset_id.0),
        pairs,
    })
}

pub fn extract_global_asset_pair(body: &str) -> Result<AssetPairDetail, String> {
    let resp: GetAssetPairResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    let common = resp.metadata.common_metadata;
    Ok(AssetPairDetail {
        main_ticker: resp.main_asset.ticker.into_inner(),
        main_name: resp.main_asset.name.into_inner(),
        ref_ticker: resp.reference_asset.ticker.into_inner(),
        ref_name: resp.reference_asset.name.into_inner(),
        latest_rate: common.as_ref().and_then(|m| m.latest_rate.to_f64()),
        last_updated: common.as_ref().map(|m| m.last_updated.unix_timestamp()),
        volume: resp.metadata.volume.and_then(|v| v.to_f64()),
        exchange: None,
    })
}

pub fn extract_user_asset_pair(body: &str) -> Result<AssetPairDetail, String> {
    let resp: GetUserAssetPairResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(AssetPairDetail {
        main_ticker: resp.main_asset.ticker.into_inner(),
        main_name: resp.main_asset.name.into_inner(),
        ref_ticker: resp.reference_asset.ticker.into_inner(),
        ref_name: resp.reference_asset.name.into_inner(),
        latest_rate: resp.metadata.as_ref().and_then(|m| m.latest_rate.to_f64()),
        last_updated: resp
            .metadata
            .as_ref()
            .map(|m| m.last_updated.unix_timestamp()),
        volume: None,
        exchange: resp.user_metadata.map(|u| u.exchange.into_inner()),
    })
}

pub fn extract_asset_types(body: &str) -> Result<Vec<AssetTypeOption>, String> {
    let resp: GetAssetTypesResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp
        .asset_types
        .into_iter()
        .map(|t| AssetTypeOption {
            id: t.id.0,
            name: t.name,
        })
        .collect())
}

pub fn extract_user_assets(body: &str) -> Result<Vec<AssetSummary>, String> {
    let resp: GetUserAssetsResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(to_summaries(resp.results, &resp.lookup_tables))
}

pub fn extract_created_asset_id(body: &str) -> Result<i32, String> {
    let resp: AddAssetResponseViewModel = serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp.asset.asset_id.0)
}

pub fn build_create_asset_body(
    name: String,
    ticker: String,
    asset_type: i32,
    base_asset_id: i32,
) -> Result<String, ApiError> {
    let request = AddAssetRequestViewModel {
        asset: AssetViewModel {
            ticker: AssetTicker::from_trusted(ticker),
            name: AssetName::from_trusted(name),
            asset_type: RequiredAssetTypeId(asset_type),
        },
        base_asset_id: RequiredAssetId(base_asset_id),
    };
    serde_json::to_string(&request).map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })
}

pub fn build_add_pair_body(reference_id: i32) -> Result<String, ApiError> {
    let request = AddAssetPairRequestViewModel {
        reference_id: RequiredAssetId(reference_id),
    };
    serde_json::to_string(&request).map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })
}

pub fn build_add_rate_body(date: i64, rate: f64) -> Result<String, ApiError> {
    if rate <= 0.0 {
        return Err(ApiError::Parse {
            reason: "rate must be positive".into(),
        });
    }
    let decimal = rust_decimal::Decimal::try_from(rate).map_err(|e| ApiError::Parse {
        reason: format!("invalid rate {rate}: {e}"),
    })?;
    let date = OffsetDateTime::from_unix_timestamp(date).map_err(|e| ApiError::Parse {
        reason: format!("invalid date: {e}"),
    })?;
    let request = AddAssetPairRatesRequestViewModel {
        rates: vec![AssetRateViewModel {
            date,
            rate: PositiveRate::from_trusted(decimal),
        }],
    };
    serde_json::to_string(&request).map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_search_page_with_type_names() {
        let body = r#"{
            "results": [
                { "asset_id": 1, "ticker": "INTC", "name": "Intel", "asset_type": 3 }
            ],
            "total_results": 2203,
            "lookup_tables": { "asset_types": [ { "name": "Stocks", "id": 3 } ] }
        }"#;
        let page = extract_asset_search_page(body).unwrap();
        assert_eq!(page.total, 2203);
        assert_eq!(page.items.len(), 1);
        assert_eq!(page.items[0].id, 1);
        assert_eq!(page.items[0].ticker, "INTC");
        assert_eq!(page.items[0].name, "Intel");
        assert_eq!(page.items[0].asset_type, "Stocks");
    }

    #[test]
    fn parses_asset_detail_with_base_and_pairs() {
        let body = r#"{
            "ticker": "BTC",
            "name": "Bitcoin",
            "asset_type": { "name": "Crypto", "id": 1 },
            "base_asset": { "asset_id": 5, "ticker": "USD", "name": "US Dollar" },
            "pairs": [
                { "asset_id": 5, "ticker": "USD", "name": "US Dollar" },
                { "asset_id": 6, "ticker": "EUR", "name": "Euro" }
            ]
        }"#;
        let d = extract_asset_detail(body, false).unwrap();
        assert_eq!(d.ticker, "BTC");
        assert_eq!(d.name, "Bitcoin");
        assert_eq!(d.asset_type, "Crypto");
        assert_eq!(d.base_pair_id, Some(5));
        assert_eq!(d.pairs.len(), 2);
        assert_eq!(d.pairs[1].ticker, "EUR");
        assert_eq!(d.display_symbol, "BTC");
        assert_eq!(d.exchange, None);
    }

    #[test]
    fn global_asset_detail_splits_exchange() {
        let body = r#"{
            "ticker": "AAPL.NASDAQ",
            "name": "Apple Inc",
            "asset_type": { "name": "Stocks", "id": 2 },
            "base_asset": { "asset_id": 5, "ticker": "USD", "name": "US Dollar" },
            "pairs": [ { "asset_id": 5, "ticker": "USD", "name": "US Dollar" } ]
        }"#;
        let d = extract_asset_detail(body, false).unwrap();
        assert_eq!(d.ticker, "AAPL.NASDAQ");
        assert_eq!(d.display_symbol, "AAPL");
        assert_eq!(d.exchange, Some("NASDAQ".to_string()));
    }

    #[test]
    fn user_asset_detail_never_splits_ticker() {
        let body = r#"{
            "ticker": "MY.FUND",
            "name": "My Fund",
            "asset_type": { "name": "ETFs", "id": 5 },
            "base_asset": null,
            "pairs": []
        }"#;
        let d = extract_asset_detail(body, true).unwrap();
        assert_eq!(d.display_symbol, "MY.FUND");
        assert_eq!(d.exchange, None);
    }

    #[test]
    fn parses_global_pair_metadata() {
        let body = r#"{
            "main_asset": { "ticker": "BTC", "name": "Bitcoin", "asset_type": { "name": "Crypto", "id": 1 } },
            "reference_asset": { "ticker": "USD", "name": "US Dollar", "asset_type": { "name": "Currency", "id": 2 } },
            "metadata": { "latest_rate": 42.57, "last_updated": 1686523200, "volume": 27681777 }
        }"#;
        let p = extract_global_asset_pair(body).unwrap();
        assert_eq!(p.main_ticker, "BTC");
        assert_eq!(p.ref_ticker, "USD");
        assert_eq!(p.latest_rate, Some(42.57));
        assert_eq!(p.last_updated, Some(1686523200));
        assert_eq!(p.volume, Some(27681777.0));
        assert_eq!(p.exchange, None);
    }

    #[test]
    fn parses_user_pair_metadata_with_exchange() {
        let body = r#"{
            "main_asset": { "ticker": "APPL", "name": "Apple Inc", "asset_type": { "name": "Stocks", "id": 1 } },
            "reference_asset": { "ticker": "USD", "name": "US Dollar", "asset_type": { "name": "Currency", "id": 2 } },
            "metadata": { "latest_rate": 150.25, "last_updated": 1686523200 },
            "user_metadata": { "exchange": "NYSE" }
        }"#;
        let p = extract_user_asset_pair(body).unwrap();
        assert_eq!(p.main_ticker, "APPL");
        assert_eq!(p.latest_rate, Some(150.25));
        assert_eq!(p.volume, None);
        assert_eq!(p.exchange, Some("NYSE".to_string()));
    }

    #[test]
    fn parses_asset_types() {
        let body = r#"{ "asset_types": [ { "name": "Stocks", "id": 1 }, { "name": "Crypto", "id": 2 } ] }"#;
        let types = extract_asset_types(body).unwrap();
        assert_eq!(types.len(), 2);
        assert_eq!(types[0].id, 1);
        assert_eq!(types[0].name, "Stocks");
    }

    #[test]
    fn parses_user_assets_list() {
        let body = r#"{
            "results": [ { "asset_id": 10, "ticker": "MCF", "name": "My Custom Fund", "asset_type": 1 } ],
            "lookup_tables": { "asset_types": [ { "name": "Stocks", "id": 1 } ] }
        }"#;
        let items = extract_user_assets(body).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].id, 10);
        assert_eq!(items[0].ticker, "MCF");
        assert_eq!(items[0].asset_type, "Stocks");
    }

    #[test]
    fn builds_create_asset_body() {
        let body = build_create_asset_body("My Fund".into(), "MCF".into(), 1, 5).unwrap();
        let v: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(v["ticker"], "MCF");
        assert_eq!(v["name"], "My Fund");
        assert_eq!(v["asset_type"], 1);
        assert_eq!(v["base_asset_id"], 5);
    }

    #[test]
    fn builds_add_pair_body() {
        let body = build_add_pair_body(7).unwrap();
        let v: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(v["reference_id"], 7);
    }

    #[test]
    fn builds_add_rate_body_with_one_rate() {
        let body = build_add_rate_body(1686523200, 150.25).unwrap();
        let v: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(v["rates"][0]["date"], 1686523200);
        assert_eq!(v["rates"][0]["rate"].as_f64().unwrap(), 150.25);
    }

    #[test]
    fn splits_exchange_suffixed_ticker() {
        assert_eq!(
            split_ticker_exchange("AAPL.NASDAQ"),
            ("AAPL".to_string(), Some("NASDAQ".to_string()))
        );
    }

    #[test]
    fn splits_at_last_dot_only() {
        assert_eq!(
            split_ticker_exchange("0P0001OMXU.AS"),
            ("0P0001OMXU".to_string(), Some("AS".to_string()))
        );
    }

    #[test]
    fn leaves_plain_tickers_alone() {
        assert_eq!(split_ticker_exchange("USD"), ("USD".to_string(), None));
        assert_eq!(split_ticker_exchange("BTC"), ("BTC".to_string(), None));
    }

    #[test]
    fn leaves_degenerate_dots_alone() {
        assert_eq!(split_ticker_exchange("AAPL."), ("AAPL.".to_string(), None));
        assert_eq!(
            split_ticker_exchange(".NASDAQ"),
            (".NASDAQ".to_string(), None)
        );
    }

    #[test]
    fn add_rate_body_rejects_non_positive() {
        assert!(build_add_rate_body(1686523200, 0.0).is_err());
    }
}
