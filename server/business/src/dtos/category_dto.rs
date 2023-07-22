use dal::models::transaction_models::CategoryModel;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CategoryDto {
    pub id: i32,
    pub name: String,
    pub icon: String,
}

impl From<CategoryModel> for CategoryDto {
    fn from(p: CategoryModel) -> Self {
        Self {
            id: p.id,
            name: p.category,
            icon: p.icon,
        }
    }
}
