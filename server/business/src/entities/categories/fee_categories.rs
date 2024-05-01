use crate::dtos::fee_entry_types_dto::FeeEntryTypesDto;

pub type FeeCategoeis = dal::enums::categories::FeeCategories;

pub fn is_fee_category(category: i32) -> bool {
    FeeCategoeis::try_from(category).is_ok()
}
