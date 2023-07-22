use business::dtos::portfolio_account_dto::PortfolioAccountDto;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioAccountViewModel {
    pub id: Option<Uuid>,
    pub name: String,
}

impl From<PortfolioAccountViewModel> for PortfolioAccountDto {
    fn from(p: PortfolioAccountViewModel) -> Self {
        Self {
            account_id: p.id,
            account_name: p.name,
        }
    }
}

impl From<PortfolioAccountDto> for PortfolioAccountViewModel {
    fn from(p: PortfolioAccountDto) -> Self {
        Self {
            id: p.account_id,
            name: p.account_name,
        }
    }
}
