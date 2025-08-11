use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::transactions::get_transaction_group::GetTransactionGroupLineResponseViewModel;

use super::transaction_types::RequiredIdentifiableTransactionWithIdentifiableEntries;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetTransactionsResultsViewModel {
    pub individual_transactions: Vec<RequiredIdentifiableTransactionWithIdentifiableEntries>,
    pub transaction_groups: Vec<GetTransactionGroupLineResponseViewModel>,
}
