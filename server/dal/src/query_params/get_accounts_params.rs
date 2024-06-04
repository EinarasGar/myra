use std::collections::HashSet;

use sqlx::types::Uuid;

pub struct GetAccountsParams {
    pub search_type: GetAccountsParamsSeachType,
    pub include_metadata: bool,
    pub include_inactive: bool,
}

impl GetAccountsParams {
    pub fn by_id_with_metadata(id: Uuid) -> Self {
        Self {
            search_type: GetAccountsParamsSeachType::ById(id),
            include_metadata: true,
            include_inactive: false,
        }
    }

    pub fn by_user_id_with_metadata(user_id: Uuid) -> Self {
        Self {
            search_type: GetAccountsParamsSeachType::ByUserId(user_id),
            include_metadata: true,
            include_inactive: false,
        }
    }

    pub fn by_ids(ids: HashSet<Uuid>) -> Self {
        Self {
            search_type: GetAccountsParamsSeachType::ByIds(ids),
            include_metadata: false,
            include_inactive: false,
        }
    }
}

pub enum GetAccountsParamsSeachType {
    ByIds(HashSet<Uuid>),
    ById(Uuid),
    ByUserId(Uuid),
}
