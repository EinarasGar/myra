use sqlx::types::Uuid;

#[derive(Debug)]
pub struct GetConnectorConnectionsParams {
    pub user_id: Uuid,
    pub search_type: GetConnectorConnectionsParamsSearchType,
}

#[derive(Debug)]
pub enum GetConnectorConnectionsParamsSearchType {
    ById(Uuid),
    All,
}

impl GetConnectorConnectionsParams {
    pub fn by_id(user_id: Uuid, id: Uuid) -> Self {
        Self {
            user_id,
            search_type: GetConnectorConnectionsParamsSearchType::ById(id),
        }
    }
    pub fn all(user_id: Uuid) -> Self {
        Self {
            user_id,
            search_type: GetConnectorConnectionsParamsSearchType::All,
        }
    }
}

#[derive(Debug)]
pub struct GetConnectorBindingsParams {
    pub user_id: Uuid,
    pub search_type: GetConnectorBindingsParamsSearchType,
}

#[derive(Debug)]
pub enum GetConnectorBindingsParamsSearchType {
    ById(Uuid),
    All,
}

impl GetConnectorBindingsParams {
    pub fn by_id(user_id: Uuid, id: Uuid) -> Self {
        Self {
            user_id,
            search_type: GetConnectorBindingsParamsSearchType::ById(id),
        }
    }
    pub fn all(user_id: Uuid) -> Self {
        Self {
            user_id,
            search_type: GetConnectorBindingsParamsSearchType::All,
        }
    }
}
