#[cfg(feature = "backend")]
use business::dtos::connectors::ProviderAccountDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct ProviderAccountViewModel {
    pub provider_account_id: String,
    pub display_name: String,
    pub currency: Option<String>,
    pub account_type: Option<String>,
}

#[cfg(feature = "backend")]
impl From<ProviderAccountDto> for ProviderAccountViewModel {
    fn from(dto: ProviderAccountDto) -> Self {
        Self {
            provider_account_id: dto.provider_account_id,
            display_name: dto.display_name,
            currency: dto.currency,
            account_type: dto.account_type,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct ListProviderAccountsResponseViewModel {
    pub accounts: Vec<ProviderAccountViewModel>,
}
