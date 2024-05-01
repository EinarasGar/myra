use dal::query_params::paging_params::PagingParams;

#[derive(Clone, Debug)]
pub struct PagingDto {
    pub start: u64,
    pub count: u64,
}

impl From<PagingDto> for PagingParams {
    fn from(value: PagingDto) -> Self {
        PagingParams {
            start: value.start,
            count: value.count,
        }
    }
}
