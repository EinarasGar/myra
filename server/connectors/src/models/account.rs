#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProviderAccount {
    pub provider_account_id: String,
    pub display_name: String,
    pub currency: Option<String>,
    pub account_type: Option<String>,
}
