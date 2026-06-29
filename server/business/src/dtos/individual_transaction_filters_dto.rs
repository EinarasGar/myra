use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Default, Clone)]
pub struct IndividualTransactionFiltersDto {
    pub search_query: Option<String>,
    pub account_id: Option<Uuid>,
    pub transaction_type_ids: Option<Vec<i32>>,
    pub date_from: Option<OffsetDateTime>,
    pub date_to: Option<OffsetDateTime>,
}
