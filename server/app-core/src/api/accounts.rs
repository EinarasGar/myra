use shared::view_models::accounts::get_accounts::GetAccountsResponseViewModel;

use crate::models::AccountListItem;

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
