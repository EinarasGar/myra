use business::dtos::portfolio_dto::{PortfolioAccountDto, PortfolioDto};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::asset_view_model::AssetViewModel;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioViewModel {
    pub portfolio_entries: Vec<PortfolioEntryViewModel>,
}

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioEntryViewModel {
    pub asset: AssetViewModel,
    pub account: PortfolioAccountViewModel,

    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub sum: Decimal,
}

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioAccountViewModel {
    pub id: Uuid,
    pub name: String,
}

impl From<PortfolioDto> for PortfolioEntryViewModel {
    fn from(p: PortfolioDto) -> Self {
        Self {
            asset: p.asset.into(),
            sum: p.sum,
            account: p.account.into(),
        }
    }
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
