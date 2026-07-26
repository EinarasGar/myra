use std::collections::HashMap;

use shared::view_models::accounts::get_account::GetAccountResponseViewModel;
use shared::view_models::accounts::get_account_types::GetAccountTypesResponseViewModel;
use shared::view_models::accounts::get_accounts::GetAccountsResponseViewModel;

use crate::models::{
    AccountEditModel, AccountIdentifier, AccountListItem, AccountTypeItem, AssetItem,
};

pub fn extract_accounts(body: &str) -> Result<Vec<AccountListItem>, String> {
    let resp: GetAccountsResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;

    let currencies: HashMap<i32, AssetItem> = resp
        .lookup_tables
        .assets
        .iter()
        .map(|a| {
            (
                a.asset_id.0,
                AssetItem {
                    id: a.asset_id.0,
                    name: a.asset.name.as_str().to_owned(),
                    ticker: a.asset.ticker.as_str().to_owned(),
                },
            )
        })
        .collect();

    let mut items: Vec<AccountListItem> = resp
        .accounts
        .into_iter()
        .map(|row| AccountListItem {
            id: row.account.account_id.0.to_string(),
            name: row.account.account.name.into_inner(),
            account_type_id: row.account.account.account_type.0,
            liquidity_type_id: row.liquidity_type.0,
            ownership_share: row
                .ownership_share
                .as_decimal()
                .to_string()
                .parse()
                .unwrap_or(1.0),
            balance: None,
            unrealized_gain: None,
            holdings_count: None,
            suggested_currency: row
                .suggested_currency
                .0
                .and_then(|id| currencies.get(&id).cloned()),
        })
        .collect();
    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(items)
}

pub fn extract_account_types(body: &str) -> Result<Vec<AccountTypeItem>, String> {
    let resp: GetAccountTypesResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(resp
        .account_types
        .into_iter()
        .map(|t| AccountTypeItem {
            id: t.id.0,
            name: t.name,
        })
        .collect())
}

pub fn extract_account_edit(account_id: &str, body: &str) -> Result<AccountEditModel, String> {
    let resp: GetAccountResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(AccountEditModel {
        id: account_id.to_string(),
        name: resp.account.name.into_inner(),
        account_type_id: resp.account.account_type.id.0,
        liquidity_type_id: resp.liquidity_type.id.0,
        ownership_share: resp
            .ownership_share
            .as_decimal()
            .to_string()
            .parse()
            .unwrap_or(1.0),
        identifiers: resp
            .identifiers
            .into_iter()
            .map(|i| AccountIdentifier {
                kind: i.kind.as_str().to_string(),
                value: i.value,
            })
            .collect(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const ACCOUNTS_BODY: &str = r#"{
        "accounts": [
            { "account_id": "11111111-1111-1111-1111-111111111111", "name": "UK Bank",
              "account_type": 1, "ownership_share": "1", "liquidity_type": 1,
              "suggested_currency": 1 },
            { "account_id": "22222222-2222-2222-2222-222222222222", "name": "New Account",
              "account_type": 1, "ownership_share": "1", "liquidity_type": 1,
              "suggested_currency": null }
        ],
        "lookup_tables": {
            "account_types": [{ "id": 1, "name": "Bank" }],
            "account_liquidity_types": [{ "id": 1, "name": "Liquid" }],
            "assets": [{ "asset_id": 1, "ticker": "GBP", "name": "Pound Sterling", "asset_type": 1 }]
        }
    }"#;

    #[test]
    fn resolves_suggested_currency_from_lookup_tables() {
        let items = extract_accounts(ACCOUNTS_BODY).unwrap();
        let uk = items.iter().find(|i| i.name == "UK Bank").unwrap();
        let currency = uk.suggested_currency.as_ref().unwrap();
        assert_eq!(currency.id, 1);
        assert_eq!(currency.ticker, "GBP");
        assert_eq!(currency.name, "Pound Sterling");
    }

    #[test]
    fn leaves_suggested_currency_none_when_null() {
        let items = extract_accounts(ACCOUNTS_BODY).unwrap();
        let new_account = items.iter().find(|i| i.name == "New Account").unwrap();
        assert!(new_account.suggested_currency.is_none());
    }

    #[test]
    fn leaves_suggested_currency_none_when_asset_missing_from_lookup() {
        let body = ACCOUNTS_BODY.replace(
            r#"{ "asset_id": 1, "ticker": "GBP", "name": "Pound Sterling", "asset_type": 1 }"#,
            "",
        );
        let items = extract_accounts(&body).unwrap();
        assert!(items.iter().all(|i| i.suggested_currency.is_none()));
    }
}
