use super::paging_params::PagingParams;

pub struct GetAssetsParams {
    pub search_type: GetAssetsParamsSeachType,
    pub include_metadata: bool,
    pub paging: Option<PagingParams>,
}

impl GetAssetsParams {
    pub fn by_id(id: i32) -> Self {
        Self {
            search_type: GetAssetsParamsSeachType::ById(id),
            paging: None,
            include_metadata: true,
        }
    }

    pub fn by_pair(pair1: i32, pair2: i32) -> Self {
        Self {
            search_type: GetAssetsParamsSeachType::ByPairId(pair1, pair2),
            paging: None,
            include_metadata: false,
        }
    }

    pub fn by_query(query: String, start: u64, count: u64) -> Self {
        Self {
            search_type: GetAssetsParamsSeachType::ByQuery(query),
            paging: Some(PagingParams { start, count }),
            include_metadata: false,
        }
    }

    pub fn all(start: u64, count: u64) -> Self {
        Self {
            search_type: GetAssetsParamsSeachType::All,
            paging: Some(PagingParams { start, count }),
            include_metadata: false,
        }
    }
}

pub enum GetAssetsParamsSeachType {
    All,
    ById(i32),
    ByPairId(i32, i32),
    ByQuery(String),
}
