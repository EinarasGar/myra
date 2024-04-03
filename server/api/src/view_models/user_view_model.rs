use serde::Serialize;
use uuid::Uuid;

use super::{
    assets::base_models::asset::IdentifiableAssetViewModel,
    portfolio_account_view_model::PortfolioAccountViewModel,
};

#[derive(Debug, Serialize)]
pub struct UserViewModel {
    pub id: Uuid,
    pub username: String,
    pub default_asset_id: IdentifiableAssetViewModel,
    pub portfolio_accounts: Vec<PortfolioAccountViewModel>,
    pub custom_assets: Vec<IdentifiableAssetViewModel>,
}
