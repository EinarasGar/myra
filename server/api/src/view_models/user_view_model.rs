use serde::Serialize;
use uuid::Uuid;

use super::{
    asset_view_model::AssetViewModel, portfolio_account_view_model::PortfolioAccountViewModel,
};

#[typeshare::typeshare]
#[derive(Debug, Serialize)]
pub struct UserViewModel {
    pub id: Uuid,
    pub username: String,
    pub default_asset_id: AssetViewModel,
    pub portfolio_accounts: Vec<PortfolioAccountViewModel>,
    pub custom_assets: Vec<AssetViewModel>,
}
