use connectors::models::ProviderAccount;

#[derive(Clone, Debug)]
pub struct ProviderAccountDto {
    pub provider_account_id: String,
    pub display_name: String,
    pub currency: Option<String>,
    pub account_type: Option<String>,
}

impl From<ProviderAccount> for ProviderAccountDto {
    fn from(account: ProviderAccount) -> Self {
        Self {
            provider_account_id: account.provider_account_id,
            display_name: account.display_name,
            currency: account.currency,
            account_type: account.account_type,
        }
    }
}
