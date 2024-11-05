use crate::{dtos::fee_entry_types_dto::FeeEntryTypesDto, dynamic_enums::DynamicEnum};

pub type FeeCategoeis = dal::enums::fee_categories::DatabaseFeeCategories;

pub fn is_fee_category(category: i32) -> bool {
    crate::dynamic_enums::fee_categories::FeeCategories::try_from_dynamic_enum(category).is_ok()
}
