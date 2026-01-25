use anyhow::Context;
use dal::database_context::MyraDb;
use dal::models::base::TotalCount;
use dal::models::category_models::CategoryWithTypeModel;
use dal::queries::category_queries;
use dal::query_params::get_categories_params::GetCategoriesParams;
use itertools::Itertools;
use uuid::Uuid;

use super::category_validation_service::CategoryValidationService;
use crate::dtos::{
    categories::{CategoryDto, CategoryError, CreateCategoryDto, UpdateCategoryDto},
    page_of_results_dto::PageOfResultsDto,
};

pub struct CategoryService {
    db: MyraDb,
    validation_service: CategoryValidationService,
}

impl CategoryService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            validation_service: CategoryValidationService::new(db.clone()),
            db,
        }
    }

    pub async fn search_categories(
        &self,
        offset: u64,
        limit: u64,
        search: Option<String>,
        type_id: Option<i32>,
    ) -> anyhow::Result<PageOfResultsDto<CategoryDto>> {
        let params = match (search, type_id) {
            (Some(query), Some(type_id)) => {
                GetCategoriesParams::shared_by_query_and_type(query, type_id, offset, limit)
            }
            (Some(query), None) => GetCategoriesParams::shared_by_query(query, offset, limit),
            (None, Some(type_id)) => GetCategoriesParams::shared_by_type(type_id, offset, limit),
            (None, None) => GetCategoriesParams::shared_all(offset, limit),
        };

        let query = category_queries::get_categories(params);
        let counted_models = self
            .db
            .fetch_all::<TotalCount<CategoryWithTypeModel>>(query)
            .await
            .context("Failed to fetch categories")?;

        if let Some(first) = counted_models.first() {
            let total_results = first.total_results;
            let categories: Vec<CategoryWithTypeModel> =
                counted_models.into_iter().map(|x| x.model).collect();

            let category_dtos: Vec<CategoryDto> = categories.into_iter().map(Into::into).collect();

            Ok(PageOfResultsDto {
                results: category_dtos,
                total_results: total_results as i32,
            })
        } else {
            Ok(PageOfResultsDto::default())
        }
    }

    pub async fn get_all_user_categories(&self, user_id: Uuid) -> anyhow::Result<Vec<CategoryDto>> {
        let params = GetCategoriesParams::user_all(user_id);

        let query = category_queries::get_categories(params);

        let models = self
            .db
            .fetch_all::<CategoryWithTypeModel>(query)
            .await
            .context("Failed to fetch categories")?;

        Ok(models.into_iter().map_into().collect())
    }

    pub async fn get_category(
        &self,
        category_id: i32,
        user_id: Uuid,
    ) -> anyhow::Result<CategoryDto> {
        let params = GetCategoriesParams::user_by_id(user_id, category_id);
        let query = category_queries::get_categories(params);
        let model = self
            .db
            .fetch_optional::<CategoryWithTypeModel>(query)
            .await
            .context("Failed to fetch category")?
            .ok_or_else(|| anyhow::anyhow!(CategoryError::NotFound))?;

        if model.user_id.is_some() && model.user_id != Some(user_id) {
            return Err(anyhow::anyhow!(CategoryError::Unauthorized));
        }

        Ok(model.into())
    }

    pub async fn create_category(
        &self,
        user_id: Uuid,
        request: CreateCategoryDto,
    ) -> anyhow::Result<CategoryDto> {
        self.validation_service
            .validate_category_name_uniqueness(&request.category, user_id, None)
            .await?;

        self.validation_service
            .validate_user_category_limit(user_id)
            .await?;

        // TODO: Validate icon when icon whitelist is available
        // For now, skip icon validation

        let insert_query = category_queries::insert_category(user_id, request.into());
        let created_id: i32 = self
            .db
            .fetch_one_scalar(insert_query)
            .await
            .context("Failed to create category")?;

        self.get_category(created_id, user_id).await
    }

    pub async fn update_category(
        &self,
        category_id: i32,
        user_id: Uuid,
        request: UpdateCategoryDto,
    ) -> anyhow::Result<CategoryDto> {
        let existing = self.get_category(category_id, user_id).await?;

        if existing.is_system {
            return Err(anyhow::anyhow!(CategoryError::SystemCategoryImmutable));
        }

        if existing.is_global {
            return Err(anyhow::anyhow!(CategoryError::Unauthorized));
        }

        if request.category != existing.category {
            self.validation_service
                .validate_category_name_uniqueness(&request.category, user_id, Some(category_id))
                .await?;
        }

        // TODO: Validate icon when icon whitelist is available

        let update_query = category_queries::update_category(category_id, user_id, request.into());
        self.db
            .execute(update_query)
            .await
            .context("Failed to update category")?;

        // Return updated category
        self.get_category(category_id, user_id).await
    }

    pub async fn delete_category(&self, category_id: i32, user_id: Uuid) -> anyhow::Result<()> {
        let category = self.get_category(category_id, user_id).await?;

        if category.is_system {
            return Err(anyhow::anyhow!(CategoryError::SystemCategoryImmutable));
        }

        if category.is_global {
            return Err(anyhow::anyhow!(CategoryError::Unauthorized));
        }

        let dependencies = self
            .validation_service
            .check_category_dependencies(category_id)
            .await?;

        if dependencies.has_dependencies {
            return Err(anyhow::anyhow!(CategoryError::HasDependencies(
                dependencies
            )));
        }

        let delete_query = category_queries::delete_category(category_id, user_id);
        self.db
            .execute(delete_query)
            .await
            .context("Failed to delete category")?;

        Ok(())
    }
}
