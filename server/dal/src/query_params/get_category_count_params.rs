use sqlx::types::Uuid;

pub enum CategoryCountFilter {
    ByUserId(Uuid),
    ByCategoryId(i32),
}

pub struct GetCategoryCountParams {
    pub filter: CategoryCountFilter,
}

impl GetCategoryCountParams {
    pub fn by_user_id(user_id: Uuid) -> Self {
        Self {
            filter: CategoryCountFilter::ByUserId(user_id),
        }
    }

    pub fn by_category_id(category_id: i32) -> Self {
        Self {
            filter: CategoryCountFilter::ByCategoryId(category_id),
        }
    }
}
