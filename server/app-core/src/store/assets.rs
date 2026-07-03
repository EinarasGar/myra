use super::infra::SharedInfra;
use crate::api::asset_rates::extract_asset_rates;
use crate::api::assets::{
    build_add_pair_body, build_add_rate_body, build_create_asset_body, extract_asset_detail,
    extract_asset_search_page, extract_asset_types, extract_converted_pair_rate,
    extract_created_asset_id, extract_global_asset_pair, extract_user_asset_pair,
    extract_user_assets,
};
use crate::error::{server_error, ApiError};
use crate::models::{
    AssetDetail, AssetPairDetail, AssetPairRef, AssetSearchPage, AssetSummary, AssetTypeOption,
    ChartPoint, ConvertedPairRate,
};

pub async fn search_global_assets(
    infra: &SharedInfra,
    query: &str,
    start: i32,
    count: i32,
    auth_token: Option<&str>,
) -> Result<AssetSearchPage, ApiError> {
    let encoded = urlencoding::encode(query);
    let path = format!("/api/assets?count={count}&start={start}&query={encoded}");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    extract_asset_search_page(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

fn asset_base_path(infra: &SharedInfra, user_asset: bool) -> Result<String, ApiError> {
    if user_asset {
        let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
            reason: "no user_id".into(),
        })?;
        Ok(format!("/api/users/{user_id}/assets"))
    } else {
        Ok("/api/assets".to_string())
    }
}

pub async fn get_asset_detail(
    infra: &SharedInfra,
    asset_id: i32,
    user_asset: bool,
    auth_token: Option<&str>,
) -> Result<AssetDetail, ApiError> {
    let base = asset_base_path(infra, user_asset)?;
    let path = format!("{base}/{asset_id}");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    let mut detail =
        extract_asset_detail(&resp.body, user_asset).map_err(|e| ApiError::Parse { reason: e })?;

    if let (Some(base_id), Some(base_ticker)) =
        (infra.default_asset_id(), infra.default_asset_ticker())
    {
        let already_present = detail.pairs.iter().any(|p| p.asset_id == base_id);
        if base_id != asset_id && detail.base_pair_id.is_some() && !already_present {
            detail.pairs.push(AssetPairRef {
                asset_id: base_id,
                ticker: base_ticker.clone(),
                name: base_ticker,
                converted: true,
            });
        }
    }

    Ok(detail)
}

pub async fn get_asset_pair(
    infra: &SharedInfra,
    asset_id: i32,
    reference_id: i32,
    user_asset: bool,
    auth_token: Option<&str>,
) -> Result<AssetPairDetail, ApiError> {
    let base = asset_base_path(infra, user_asset)?;
    let path = format!("{base}/{asset_id}/{reference_id}");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    let parsed = if user_asset {
        extract_user_asset_pair(&resp.body)
    } else {
        extract_global_asset_pair(&resp.body)
    };
    parsed.map_err(|e| ApiError::Parse { reason: e })
}

pub async fn get_asset_pair_rates(
    infra: &SharedInfra,
    asset_id: i32,
    reference_id: i32,
    range: &str,
    user_asset: bool,
    auth_token: Option<&str>,
) -> Result<Vec<ChartPoint>, ApiError> {
    let base = asset_base_path(infra, user_asset)?;
    let path = format!("{base}/{asset_id}/{reference_id}/rates?range={range}");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    extract_asset_rates(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn get_asset_pair_converted(
    infra: &SharedInfra,
    asset_id: i32,
    reference_id: i32,
    user_asset: bool,
    auth_token: Option<&str>,
) -> Result<ConvertedPairRate, ApiError> {
    let base = asset_base_path(infra, user_asset)?;
    let path = format!("{base}/{asset_id}/{reference_id}/converted");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    extract_converted_pair_rate(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn get_asset_pair_converted_rates(
    infra: &SharedInfra,
    asset_id: i32,
    reference_id: i32,
    range: &str,
    user_asset: bool,
    auth_token: Option<&str>,
) -> Result<Vec<ChartPoint>, ApiError> {
    let base = asset_base_path(infra, user_asset)?;
    let path = format!("{base}/{asset_id}/{reference_id}/converted/rates?range={range}");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    extract_asset_rates(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn get_asset_types(
    infra: &SharedInfra,
    auth_token: Option<&str>,
) -> Result<Vec<AssetTypeOption>, ApiError> {
    let resp = infra.get("/api/assets/types", auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    extract_asset_types(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

pub async fn get_user_assets(
    infra: &SharedInfra,
    auth_token: Option<&str>,
) -> Result<Vec<AssetSummary>, ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let path = format!("/api/users/{user_id}/assets");
    let resp = infra.get(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    extract_user_assets(&resp.body).map_err(|e| ApiError::Parse { reason: e })
}

fn evict_user_assets(infra: &SharedInfra, user_id: &str) {
    infra.evict_memory_cache_prefix(&format!("/api/users/{user_id}/assets"));
}

pub async fn create_user_asset(
    infra: &SharedInfra,
    name: String,
    ticker: String,
    asset_type: i32,
    base_asset_id: i32,
    auth_token: Option<&str>,
) -> Result<i32, ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let body = build_create_asset_body(name, ticker, asset_type, base_asset_id)?;
    let path = format!("/api/users/{user_id}/assets");
    let resp = infra.post(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    let new_id = extract_created_asset_id(&resp.body).map_err(|e| ApiError::Parse { reason: e })?;
    evict_user_assets(infra, &user_id);
    Ok(new_id)
}

pub async fn update_base_asset(
    infra: &SharedInfra,
    asset_id: i32,
    ticker: String,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let body = serde_json::json!({ "asset_id": asset_id }).to_string();
    let path = format!("/api/users/{user_id}/base-asset");
    let resp = infra.post(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    infra.set_default_asset_id(asset_id);
    infra.set_default_asset_ticker(ticker);
    Ok(())
}

pub async fn add_user_asset_pair(
    infra: &SharedInfra,
    asset_id: i32,
    reference_id: i32,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let body = build_add_pair_body(reference_id)?;
    let path = format!("/api/users/{user_id}/assets/{asset_id}/pairs");
    let resp = infra.post(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    evict_user_assets(infra, &user_id);
    Ok(())
}

pub async fn add_user_asset_rate(
    infra: &SharedInfra,
    asset_id: i32,
    reference_id: i32,
    date: i64,
    rate: f64,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let body = build_add_rate_body(date, rate)?;
    let path = format!("/api/users/{user_id}/assets/{asset_id}/{reference_id}/rates");
    let resp = infra.post(&path, &body, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    evict_user_assets(infra, &user_id);
    Ok(())
}

pub async fn delete_user_asset(
    infra: &SharedInfra,
    asset_id: i32,
    auth_token: Option<&str>,
) -> Result<(), ApiError> {
    let user_id = infra.user_id().ok_or_else(|| ApiError::Parse {
        reason: "no user_id".into(),
    })?;
    let path = format!("/api/users/{user_id}/assets/{asset_id}");
    let resp = infra.delete(&path, auth_token).await?;
    if resp.status >= 400 {
        return Err(server_error(resp.status, &resp.body));
    }
    evict_user_assets(infra, &user_id);
    Ok(())
}
