use rust_decimal::Decimal;
use uuid::Uuid;

use super::{entry_dto::EntryDto, fee_entry_types_dto::FeeEntryTypesDto};

#[derive(Clone, Debug)]
pub struct FeeEntryDto {
    pub entry: EntryDto,
    pub entry_type: FeeEntryTypesDto,
}
