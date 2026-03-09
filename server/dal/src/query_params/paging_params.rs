use sqlx::types::Uuid;

pub struct PagingParams {
    pub start: u64,
    pub count: u64,
}

pub struct CursorPagingParams {
    pub cursor_id: Uuid,
    pub limit: u64,
}

pub enum PaginationMode {
    Offset(PagingParams),
    Cursor(CursorPagingParams),
    CursorFirstPage { limit: u64 },
}
