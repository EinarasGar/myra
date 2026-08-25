use uuid::Uuid;

use crate::models::file_models::FileStatus;

pub struct GetFilesParams {
    pub user_id: Uuid,
    pub search_type: GetFilesParamsSearchType,
    pub status: Option<FileStatus>,
    pub order_by_created_at_desc: bool,
}

impl GetFilesParams {
    pub fn by_id(user_id: Uuid, id: Uuid) -> Self {
        Self {
            user_id,
            search_type: GetFilesParamsSearchType::ById(id),
            status: None,
            order_by_created_at_desc: false,
        }
    }

    pub fn by_ids(user_id: Uuid, ids: Vec<Uuid>) -> Self {
        Self {
            user_id,
            search_type: GetFilesParamsSearchType::ByIds(ids),
            status: None,
            order_by_created_at_desc: false,
        }
    }

    pub fn by_key_prefix(user_id: Uuid, prefix: String) -> Self {
        Self {
            user_id,
            search_type: GetFilesParamsSearchType::ByKeyPrefix(prefix),
            status: None,
            order_by_created_at_desc: false,
        }
    }

    pub fn with_status(mut self, status: FileStatus) -> Self {
        self.status = Some(status);
        self
    }

    pub fn with_created_at_desc(mut self) -> Self {
        self.order_by_created_at_desc = true;
        self
    }
}

pub enum GetFilesParamsSearchType {
    ById(Uuid),
    ByIds(Vec<Uuid>),
    ByKeyPrefix(String),
}
