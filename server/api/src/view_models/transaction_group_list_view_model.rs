use serde::{Deserialize, Serialize};

use crate::view_models::asset_view_model::AssetViewModel;

use super::transaction_group_view_model::TransactionGroupViewModel;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionGroupListViewModel {
    pub groups: Vec<TransactionGroupViewModel>,
    pub assets_lookup_table: Vec<AssetViewModel>,
}
