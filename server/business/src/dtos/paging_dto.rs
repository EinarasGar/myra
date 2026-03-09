use dal::query_params::paging_params::{CursorPagingParams, PaginationMode, PagingParams};
use uuid::Uuid;

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

pub enum PaginationModeDto {
    Offset { start: u64, count: u64 },
    Cursor { cursor_id: Uuid, limit: u64 },
    CursorFirstPage { limit: u64 },
}

impl PaginationModeDto {
    pub fn page_size(&self) -> u64 {
        match *self {
            Self::Offset { count, .. } => count,
            Self::Cursor { limit, .. } | Self::CursorFirstPage { limit } => limit,
        }
    }
}

impl From<PaginationModeDto> for PaginationMode {
    fn from(value: PaginationModeDto) -> Self {
        match value {
            PaginationModeDto::Offset { start, count } => {
                PaginationMode::Offset(PagingParams { start, count })
            }
            PaginationModeDto::Cursor { cursor_id, limit } => {
                PaginationMode::Cursor(CursorPagingParams { cursor_id, limit })
            }
            PaginationModeDto::CursorFirstPage { limit } => {
                PaginationMode::CursorFirstPage { limit }
            }
        }
    }
}

pub struct CursorPageOfResultsDto<T> {
    pub results: Vec<T>,
    pub has_more: bool,
    pub next_cursor: Option<Uuid>,
    pub total_results: Option<i64>,
}
