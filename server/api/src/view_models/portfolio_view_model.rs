use serde::{Deserialize, Serialize};

use super::portfolio_entry_view_model::PortfolioEntryViewModel;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PortfolioViewModel {
    pub portfolio_entries: Vec<PortfolioEntryViewModel>,
}
