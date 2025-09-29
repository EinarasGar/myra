use dal::database_context::MyraDb;
use dal::models::category_models::{CategoryUsageCount, CategoryWithTypeModel};
use dal::queries::{category_queries, category_type_queries};
use dal::query_params::get_categories_params::GetCategoriesParams;
use dal::query_params::get_category_count_params::GetCategoryCountParams;
use uuid::Uuid;

use crate::dtos::categories::{CategoryError, DependencyCheckResult};

pub struct CategoryValidationService {
    db: MyraDb,
}

impl CategoryValidationService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    pub async fn validate_category_name_uniqueness(
        &self,
        name: &str,
        user_id: Uuid,
        exclude_id: Option<i32>,
    ) -> anyhow::Result<()> {
        let global_query = category_queries::check_duplicate_category_name(name, None);
        let global_count: (i64,) = self.db.fetch_one(global_query).await?;

        if global_count.0 > 0 {
            if let Some(id) = exclude_id {
                let params = GetCategoriesParams::by_id(user_id, id);
                let check_query = category_queries::get_categories(params);
                let existing = self
                    .db
                    .fetch_optional::<CategoryWithTypeModel>(check_query)
                    .await?;

                if let Some(cat) = existing {
                    if cat.category.to_lowercase() != name.to_lowercase() {
                        return Err(anyhow::anyhow!(CategoryError::DuplicateName(
                            name.to_string()
                        )));
                    }
                } else {
                    return Err(anyhow::anyhow!(CategoryError::DuplicateName(
                        name.to_string()
                    )));
                }
            } else {
                return Err(anyhow::anyhow!(CategoryError::DuplicateName(
                    name.to_string()
                )));
            }
        }

        let user_query = category_queries::check_duplicate_category_name(name, Some(user_id));
        let user_count: (i64,) = self.db.fetch_one(user_query).await?;

        if user_count.0 > 0 && (exclude_id.is_none() || true) {
            return Err(anyhow::anyhow!(CategoryError::DuplicateName(
                name.to_string()
            )));
        }

        Ok(())
    }

    pub async fn validate_user_category_limit(&self, user_id: Uuid) -> anyhow::Result<()> {
        const CATEGORY_LIMIT: u32 = 100;

        let params = GetCategoryCountParams::by_user_id(user_id);
        let query = category_queries::get_category_count(params);
        let result: CategoryUsageCount = self.db.fetch_one(query).await?;
        let count = result.count as u32;

        if count >= CATEGORY_LIMIT {
            return Err(anyhow::anyhow!(CategoryError::LimitExceeded {
                limit: CATEGORY_LIMIT,
                current: count
            }));
        }

        Ok(())
    }

    pub async fn validate_user_type_limit(&self, user_id: Uuid) -> anyhow::Result<()> {
        const TYPE_LIMIT: u32 = 20;

        let query = category_type_queries::get_user_category_type_count(user_id);
        let result: CategoryUsageCount = self.db.fetch_one(query).await?;
        let count = result.count as u32;

        if count >= TYPE_LIMIT {
            return Err(anyhow::anyhow!(CategoryError::LimitExceeded {
                limit: TYPE_LIMIT,
                current: count
            }));
        }

        Ok(())
    }

    pub async fn check_category_dependencies(
        &self,
        category_id: i32,
    ) -> anyhow::Result<DependencyCheckResult> {
        let params = GetCategoryCountParams::by_category_id(category_id);
        let query = category_queries::get_category_count(params);
        let result: CategoryUsageCount = self.db.fetch_one(query).await?;
        let count = result.count as u32;

        Ok(DependencyCheckResult {
            has_dependencies: count > 0,
            dependency_count: count,
            dependency_type: if count > 0 {
                Some("transactions".to_string())
            } else {
                None
            },
        })
    }

    pub async fn check_type_dependencies(
        &self,
        type_id: i32,
    ) -> anyhow::Result<DependencyCheckResult> {
        let query = category_type_queries::check_category_type_usage(type_id);
        let result: CategoryUsageCount = self.db.fetch_one(query).await?;
        let count = result.count as u32;

        Ok(DependencyCheckResult {
            has_dependencies: count > 0,
            dependency_count: count,
            dependency_type: if count > 0 {
                Some("categories".to_string())
            } else {
                None
            },
        })
    }
}
