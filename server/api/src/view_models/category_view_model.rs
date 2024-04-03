use business::dtos::category_dto::CategoryDto;
use serde::{Deserialize, Serialize};


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
