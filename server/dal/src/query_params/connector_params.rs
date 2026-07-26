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
pub struct GetRawPagesParams {
    pub search_type: GetRawPagesParamsSearchType,
    pub after_page_id: Option<Uuid>,
}

#[derive(Debug)]
pub enum GetRawPagesParamsSearchType {
    ByProviderAccountRef(Uuid),
    ByExternalAccount {
        connection_id: Uuid,
        external_account_id: String,
    },
}

impl GetRawPagesParams {
    pub fn by_provider_account_ref(
        provider_account_ref: Uuid,
        after_page_id: Option<Uuid>,
    ) -> Self {
        Self {
            search_type: GetRawPagesParamsSearchType::ByProviderAccountRef(provider_account_ref),
            after_page_id,
        }
    }
    pub fn by_external_account(connection_id: Uuid, external_account_id: String) -> Self {
        Self {
            search_type: GetRawPagesParamsSearchType::ByExternalAccount {
                connection_id,
                external_account_id,
            },
            after_page_id: None,
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
