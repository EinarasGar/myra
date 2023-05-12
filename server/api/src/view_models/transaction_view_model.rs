use business::dtos::transaction_dto::CategoryDto;
use serde::{Serialize, Deserialize};

pub mod add_transaction_view_model;
pub mod get_tramscaton_view_model;

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CategoryViewModel {
    pub id: i32,
    pub name: String,
    pub icon: String,
}

impl From<CategoryDto> for CategoryViewModel {
    fn from(p: CategoryDto) -> Self {
        Self {
            id: p.id,
            name: p.name,
            icon: p.icon,
        }
    }
}