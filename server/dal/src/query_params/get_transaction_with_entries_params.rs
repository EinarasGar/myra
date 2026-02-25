use sqlx::types::Uuid;

use super::paging_params::PagingParams;

pub struct GetTransactionWithEntriesParams {
    pub search_type: GetTransactionWithEntriesParamsSeachType,
    pub paging: Option<PagingParams>,
    pub apply_ownership_share: bool,
}

impl GetTransactionWithEntriesParams {
    pub fn by_transaction_id(transaction_id: Uuid) -> Self {
        Self {
            search_type: GetTransactionWithEntriesParamsSeachType::ByTransactionId(transaction_id),
            paging: None,
            apply_ownership_share: false,
        }
    }

    pub fn by_transaction_ids(transaction_ids: Vec<Uuid>) -> Self {
        Self {
            search_type: GetTransactionWithEntriesParamsSeachType::ByTransactionIds(
                transaction_ids,
            ),
            paging: None,
            apply_ownership_share: false,
        }
    }

    pub fn by_user_id(user_id: Uuid) -> Self {
        Self {
            search_type: GetTransactionWithEntriesParamsSeachType::ByUserId(user_id),
            paging: None,
            apply_ownership_share: false,
        }
    }

    pub fn by_user_id_paged(user_id: Uuid, paging_params: PagingParams) -> Self {
        Self {
            search_type: GetTransactionWithEntriesParamsSeachType::ByUserId(user_id),
            paging: Some(paging_params),
            apply_ownership_share: false,
        }
    }

    pub fn by_user_id_with_ownership(user_id: Uuid) -> Self {
        Self {
            search_type: GetTransactionWithEntriesParamsSeachType::ByUserId(user_id),
            paging: None,
            apply_ownership_share: true,
        }
    }
}

pub enum GetTransactionWithEntriesParamsSeachType {
    ByTransactionId(Uuid),
    ByTransactionIds(Vec<Uuid>),
    ByUserId(Uuid),
}
