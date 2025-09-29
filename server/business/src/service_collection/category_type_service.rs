use anyhow::Context;
use dal::database_context::MyraDb;
use dal::models::category_models::CategoryTypeModel;
use dal::queries::category_type_queries;
use dal::query_params::get_category_types_params::GetCategoryTypesParams;
use itertools::Itertools;
use uuid::Uuid;

use super::category_validation_service::CategoryValidationService;
use crate::dtos::categories::{
    CategoryError, CategoryTypeDto, CreateCategoryTypeDto, UpdateCategoryTypeDto,
};

pub struct CategoryTypeService {
    db: MyraDb,
    validation_service: CategoryValidationService,
}

impl CategoryTypeService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            validation_service: CategoryValidationService::new(db.clone()),
            db,
        }
    }

    pub async fn get_category_types(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<impl Iterator<Item = CategoryTypeDto>> {
        let params = GetCategoryTypesParams::all(user_id);

        let query = category_type_queries::get_category_types(params);
        let types: Vec<CategoryTypeModel> = self
            .db
            .fetch_all(query)
            .await
            .context("Failed to fetch category types")?;

        Ok(types.into_iter().map_into())
    }

    pub async fn create_category_type(
        &self,
        user_id: Uuid,
        request: CreateCategoryTypeDto,
    ) -> anyhow::Result<CategoryTypeDto> {
        self.validation_service
            .validate_user_type_limit(user_id)
            .await?;

        let insert_query = category_type_queries::insert_category_type(user_id, request.into());
        let created = self
            .db
            .fetch_one::<CategoryTypeModel>(insert_query)
            .await
            .context("Failed to create category type")?;

        Ok(created.into())
    }

    pub async fn update_category_type(
        &self,
        type_id: i32,
        user_id: Uuid,
        request: UpdateCategoryTypeDto,
    ) -> anyhow::Result<CategoryTypeDto> {
        let update_query =
            category_type_queries::update_category_type(type_id, user_id, request.into());

        let updated = self
            .db
            .fetch_optional::<CategoryTypeModel>(update_query)
            .await
            .context("Failed to update category type")?
            .ok_or_else(|| anyhow::anyhow!(CategoryError::NotFound))?;

        Ok(updated.into())
    }

    pub async fn delete_category_type(&self, type_id: i32, user_id: Uuid) -> anyhow::Result<()> {
        let dependencies = self
            .validation_service
            .check_type_dependencies(type_id)
            .await?;

        if dependencies.has_dependencies {
            return Err(anyhow::anyhow!(CategoryError::HasDependencies(
                dependencies
            )));
        }

        let delete_query = category_type_queries::delete_category_type(type_id, user_id);
        self.db
            .execute(delete_query)
            .await
            .context("Failed to delete category type")?;

        Ok(())
    }
}
