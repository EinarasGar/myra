use std::collections::HashSet;

use super::paging_params::PagingParams;

pub struct GetAssetsParams {
    pub search_type: GetAssetsParamsSeachType,
    pub include_metadata: bool,
    pub paging: Option<PagingParams>,
    pub asset_type: Option<i32>,
}

impl GetAssetsParams {
    pub fn by_id(id: i32) -> Self {
        Self {
            search_type: GetAssetsParamsSeachType::ById(id),
            paging: None,
            include_metadata: true,
            asset_type: None,
        }
    }

    pub fn by_ids(ids: HashSet<i32>) -> Self {
        Self {
            search_type: GetAssetsParamsSeachType::ByIds(ids),
            paging: None,
            include_metadata: false,
            asset_type: None,
        }
    }

    pub fn by_pair(pair1: i32, pair2: i32) -> Self {
        Self {
            search_type: GetAssetsParamsSeachType::ByPairId(pair1, pair2),
            paging: None,
            include_metadata: false,
            asset_type: None,
        }
    }

    pub fn by_query(query: String, start: u64, count: u64) -> Self {
        Self {
            search_type: GetAssetsParamsSeachType::ByQuery(query),
            paging: Some(PagingParams { start, count }),
            include_metadata: false,
            asset_type: None,
        }
    }

    pub fn all(start: u64, count: u64) -> Self {
        Self {
            search_type: GetAssetsParamsSeachType::All,
            paging: Some(PagingParams { start, count }),
            include_metadata: false,
            asset_type: None,
        }
    }

    pub fn with_asset_type(mut self, asset_type: Option<i32>) -> Self {
        self.asset_type = asset_type;
        self
    }
}

pub enum GetAssetsParamsSeachType {
    All,
    ByIds(HashSet<i32>),
    ById(i32),
    ByPairId(i32, i32),
    ByQuery(String),
}
