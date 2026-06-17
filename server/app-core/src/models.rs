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
    /// Primary amount line. For single-entry transactions this is the whole
    /// amount; for two-entry transactions (purchase/sale/trade) it is the
    /// outgoing leg, with the incoming leg in `secondary_amount_display`.
    pub amount_display: String,
    /// Incoming leg for two-entry transactions; `None` for single-entry.
    pub secondary_amount_display: Option<String>,
    pub account_name: String,
    pub asset_display: String,
    pub category_name: String,
    pub category_id: Option<i32>,
    /// Lucide icon name for the transaction's category, when it has one.
    /// Empty for asset/cash operations that carry no category.
    pub category_icon: String,
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
pub struct AccountTypeItem {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct AccountListItem {
    pub id: String,
    pub name: String,
    pub account_type_id: i32,
    pub liquidity_type_id: i32,
    pub ownership_share: f64,
    pub balance: Option<f64>,
    pub unrealized_gain: Option<f64>,
    pub holdings_count: Option<u32>,
}

#[derive(Debug, Clone, uniffi::Record, serde::Serialize)]
pub struct AccountIdentifier {
    pub kind: String,
    pub value: String,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct CreateAccountInput {
    pub name: String,
    pub account_type_id: i32,
    pub liquidity_type_id: i32,
    pub ownership_share: f64,
    pub identifiers: Vec<AccountIdentifier>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct UpdateAccountInput {
    pub name: String,
    pub account_type_id: i32,
    pub liquidity_type_id: i32,
    pub ownership_share: f64,
    pub identifiers: Vec<AccountIdentifier>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct AccountEditModel {
    pub id: String,
    pub name: String,
    pub account_type_id: i32,
    pub liquidity_type_id: i32,
    pub ownership_share: f64,
    pub identifiers: Vec<AccountIdentifier>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct AssetItem {
    pub id: i32,
    pub name: String,
    pub ticker: String,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct AssetSummary {
    pub id: i32,
    pub name: String,
    pub ticker: String,
    pub asset_type: String,
}
#[derive(Debug, Clone, uniffi::Record)]
pub struct AssetSearchPage {
    pub items: Vec<AssetSummary>,
    pub total: i32,
}
#[derive(Debug, Clone, uniffi::Record)]
pub struct AssetPairRef {
    pub asset_id: i32,
    pub ticker: String,
    pub name: String,
}
#[derive(Debug, Clone, uniffi::Record)]
pub struct AssetDetail {
    pub ticker: String,
    pub display_symbol: String,
    pub exchange: Option<String>,
    pub name: String,
    pub asset_type: String,
    pub base_pair_id: Option<i32>,
    pub pairs: Vec<AssetPairRef>,
}
#[derive(Debug, Clone, uniffi::Record)]
pub struct AssetPairDetail {
    pub main_ticker: String,
    pub main_name: String,
    pub ref_ticker: String,
    pub ref_name: String,
    pub latest_rate: Option<f64>,
    pub last_updated: Option<i64>,
    pub volume: Option<f64>,
    pub exchange: Option<String>,
}
#[derive(Debug, Clone, uniffi::Record)]
pub struct AssetTypeOption {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct CategoryItem {
    pub id: i32,
    pub name: String,
    pub icon: String,
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

#[derive(Debug, Clone, uniffi::Record)]
pub struct PendingUpload {
    pub local_id: String,
    pub mime_type: String,
    pub status: String,
    pub server_upload_id: Option<String>,
    pub retry_count: u32,
    pub created_at: i64,
    pub error_message: Option<String>,
    pub thumbnail: Option<Vec<u8>>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct UnifiedQuickUploadItem {
    pub id: String,
    pub status: String,
    pub proposal_type: Option<String>,
    pub proposal_data: Option<String>,
    pub error_message: Option<String>,
    pub thumbnail: Option<Vec<u8>>,
    pub created_at: i64,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct QuickUploadDetail {
    pub status: String,
    pub source_file_id: String,
    pub proposal_type: Option<String>,
    pub proposal_data: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub lookup_tables: String,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct ChartPeriodData {
    pub period: String,
    pub points: Vec<ChartPoint>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct ChartPoint {
    pub timestamp: i64,
    pub value: f64,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct PortfolioState {
    pub is_loading: bool,
    pub error: Option<String>,
    pub holdings: Vec<HoldingItem>,
    pub chart_data: Vec<ChartPeriodData>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct TransactionsState {
    pub is_loading: bool,
    pub is_loading_more: bool,
    pub error: Option<String>,
    pub items: Vec<TransactionListItem>,
    pub has_more: bool,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct QuickUploadsState {
    pub items: Vec<UnifiedQuickUploadItem>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct AccountsState {
    pub is_loading: bool,
    pub is_loading_balances: bool,
    pub error: Option<String>,
    pub accounts: Vec<AccountListItem>,
    pub total_net_worth: f64,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct AccountHoldingItem {
    pub asset_id: i32,
    pub ticker: String,
    pub name: String,
    pub asset_type_id: i32,
    pub units: f64,
    pub value: f64,
    pub cost_basis: f64,
    pub unrealized_gains: f64,
    pub realized_gains: f64,
    pub total_fees: f64,
    pub current_price: f64,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct AccountDetailState {
    pub is_loading: bool,
    pub error: Option<String>,
    pub account_id: String,
    pub account_name: String,
    pub account_type_id: i32,
    pub chart_data: Vec<ChartPeriodData>,
    pub holdings: Vec<AccountHoldingItem>,
    pub cash_balance: f64,
    pub total_value: f64,
    pub total_cost_basis: f64,
    pub unrealized_gains: f64,
    pub realized_gains: f64,
    pub total_fees: f64,
    pub recent_transactions: Vec<TransactionListItem>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct AccountTransactionsState {
    pub is_loading: bool,
    pub is_loading_more: bool,
    pub error: Option<String>,
    pub items: Vec<TransactionListItem>,
    pub has_more: bool,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct LotItem {
    pub units_bought: f64,
    pub units_remaining: f64,
    pub units_sold: f64,
    pub buy_date: i64,
    pub buy_price_per_unit: f64,
    pub cost_basis: f64,
    pub realized_gains: f64,
    pub unrealized_gains: f64,
    pub gain_percent: f64,
    pub current_value: f64,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct AssetDetailState {
    pub is_loading: bool,
    pub error: Option<String>,
    pub asset_id: i32,
    pub ticker: String,
    pub name: String,
    pub units: f64,
    pub value: f64,
    pub cost_basis: f64,
    pub unrealized_gains: f64,
    pub total_fees: f64,
    pub current_price: f64,
    pub chart_data: Vec<ChartPeriodData>,
    pub lots: Vec<LotItem>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct ManagedCategory {
    pub id: i32,
    pub name: String,
    pub icon: String,
    pub category_type_id: i32,
    pub type_name: String,
    pub is_global: bool,
    pub is_system: bool,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct ManagedCategoryType {
    pub id: i32,
    pub name: String,
    pub is_global: bool,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct CategoriesState {
    pub is_loading: bool,
    pub error: Option<String>,
    pub categories: Vec<ManagedCategory>,
    pub types: Vec<ManagedCategoryType>,
}

// ── AI Chat ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, uniffi::Record)]
pub struct ConversationItem {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct ChatMessage {
    pub role: String,
    pub parts: Vec<MessagePart>,
}

#[derive(Debug, Clone, uniffi::Enum)]
pub enum MessagePart {
    Text {
        content: String,
    },
    Reasoning {
        content: String,
    },
    ToolCall {
        call_id: String,
        name: String,
        params: String,
        state: String,
        output: Option<String>,
    },
    File {
        file_id: String,
        media_type: String,
        url: String,
    },
}

#[derive(Debug, Clone, uniffi::Enum)]
pub enum ChatStreamEvent {
    TextDelta {
        delta: String,
    },
    ReasoningDelta {
        delta: String,
    },
    ToolCall {
        call_id: String,
        name: String,
        params: String,
    },
    ToolResult {
        name: String,
        output: String,
    },
    ToolApprovalRequired {
        call_id: String,
        name: String,
        params: String,
    },
    Error {
        message: String,
    },
    RateLimited {
        message: String,
        retry_after_seconds: Option<i64>,
    },
    Done,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct FileUploadResult {
    pub file_id: String,
}
