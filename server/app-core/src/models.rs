#[derive(Debug, Clone, uniffi::Record)]
pub struct ApiResponse {
    pub status: u16,
    pub body: String,
}

#[derive(Debug, Clone, serde::Deserialize, uniffi::Record)]
pub struct AuthMe {
    pub user_id: String,
    pub default_asset_id: i32,
    pub role: String,
    pub user_metadata: Option<UserMetadata>,
}

#[derive(Debug, Clone, serde::Deserialize, uniffi::Record)]
pub struct UserMetadata {
    pub username: String,
    pub image_url: Option<String>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct TransactionListItem {
    pub id: String,
    pub date: i64,
    pub description: String,
    pub transaction_type: String,
    pub type_label: String,
    pub amount_display: String,
    pub account_name: String,
    pub asset_display: String,
    pub category_name: String,
    pub is_group: bool,
    pub group_size: u32,
    pub children: Vec<TransactionListItem>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct TransactionsPage {
    pub items: Vec<TransactionListItem>,
    pub has_more: bool,
    pub next_cursor: Option<String>,
    pub total_results: Option<i64>,
}
