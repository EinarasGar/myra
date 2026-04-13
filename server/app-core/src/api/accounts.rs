use shared::view_models::accounts::get_accounts::GetAccountsResponseViewModel;

use crate::models::AccountItem;

pub fn extract_accounts(body: &str) -> Result<Vec<AccountItem>, String> {
    let resp: GetAccountsResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    let mut items: Vec<AccountItem> = resp
        .accounts
        .into_iter()
        .map(|row| AccountItem {
            id: row.account.account_id.0.to_string(),
            name: row.account.account.name.into_inner(),
        })
        .collect();
    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(items)
}
