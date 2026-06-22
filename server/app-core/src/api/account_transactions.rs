use shared::view_models::base_models::search::AccountTransactionsPage;

use crate::api::transactions::to_list_item;
use crate::models::TransactionListItem;

pub struct AccountTransactionsData {
    pub items: Vec<TransactionListItem>,
    pub has_more: bool,
}

pub fn extract_account_transactions(body: &str) -> Result<AccountTransactionsData, String> {
    let resp: AccountTransactionsPage = serde_json::from_str(body).map_err(|e| e.to_string())?;

    let tables = &resp.lookup_tables;
    let items: Vec<TransactionListItem> = resp
        .results
        .iter()
        .map(|tx| to_list_item(tx, tables))
        .collect();

    let total = resp.total_results as i64;
    let has_more = (items.len() as i64) < total;

    Ok(AccountTransactionsData { items, has_more })
}
