use shared::view_models::accounts::get_account::GetAccountResponseViewModel;
use shared::view_models::accounts::get_account_types::GetAccountTypesResponseViewModel;
use shared::view_models::accounts::get_accounts::GetAccountsResponseViewModel;

use crate::models::{AccountEditModel, AccountIdentifier, AccountListItem, AccountTypeItem};

pub fn extract_accounts(body: &str) -> Result<Vec<AccountListItem>, String> {
    let resp: GetAccountsResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
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
