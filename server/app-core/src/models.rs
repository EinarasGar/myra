#[derive(Debug, Clone, uniffi::Enum)]
pub enum ConnectionStatus {
    Online,
    DeviceOffline,
    ServerUnreachable,
}

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
    pub category_id: Option<i32>,
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

#[derive(Debug, Clone, uniffi::Record)]
pub struct HoldingItem {
    pub asset_name: String,
    pub ticker: String,
    pub units: f64,
    pub value: f64,
    pub asset_type_id: i32,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct AccountItem {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct AssetItem {
    pub id: i32,
    pub name: String,
    pub ticker: String,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct CategoryItem {
    pub id: i32,
    pub name: String,
}

/// Flat Kotlin-friendly representation of an existing transaction, used to
/// pre-fill the edit form on the client side.
#[derive(Debug, Clone, uniffi::Record)]
pub struct EditableTransaction {
    pub type_key: String,
    pub date: i64,
    pub description: String,
    pub category_id: Option<i32>,
    pub category_name: String,
    pub origin_asset_id: Option<i32>,
    pub origin_asset_display: String,
    pub primary_entry_id: Option<i32>,
    pub primary_account_id: String,
    pub primary_account_name: String,
    pub primary_asset_id: i32,
    pub primary_asset_display: String,
    pub primary_amount: f64,
    pub secondary_entry_id: Option<i32>,
    pub secondary_account_id: Option<String>,
    pub secondary_account_name: Option<String>,
    pub secondary_asset_id: Option<i32>,
    pub secondary_asset_display: Option<String>,
    pub secondary_amount: Option<f64>,
}

/// Flat Kotlin-friendly payload for creating an individual transaction.
/// The `type_key` matches the wire-format discriminator (e.g. "regular",
/// "asset_purchase", "cash_transfer_in"). Fields that don't apply to a given
/// type may be left as `None`.
#[derive(Debug, Clone, uniffi::Record)]
pub struct CreateTransactionInput {
    pub transaction_id: Option<String>,
    pub type_key: String,
    pub date: i64,
    pub primary_entry_id: Option<i32>,
    pub primary_account_id: String,
    pub primary_asset_id: i32,
    pub primary_amount: f64,
    pub secondary_entry_id: Option<i32>,
    pub secondary_account_id: Option<String>,
    pub secondary_asset_id: Option<i32>,
    pub secondary_amount: Option<f64>,
    pub origin_asset_id: Option<i32>,
    pub category_id: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct CreateTransactionGroupInput {
    pub date: i64,
    pub description: String,
    pub category_id: i32,
    pub transactions: Vec<CreateTransactionInput>,
}
