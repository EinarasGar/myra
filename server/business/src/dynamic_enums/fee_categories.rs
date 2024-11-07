use std::{collections::HashMap, sync::Mutex};

use async_trait::async_trait;
use dal::{
    database_connection::MyraDbConnection, database_context::MyraDb,
    enums::fee_categories::DatabaseFeeCategories,
    models::transaction_models::TransactionCategoryFeeEnumModel,
    queries::transaction_categories_queries,
};
use once_cell::sync::Lazy;

use crate::loader::{Loader, LoaderError};

use super::DynamicEnum;

static FEE_CATEGORIES: Lazy<Mutex<Option<HashMap<DatabaseFeeCategories, i32>>>> =
    Lazy::new(|| Mutex::new(None));

#[derive(Debug)]
pub struct FeeCategories;

#[async_trait]
impl Loader for FeeCategories {
    #[tracing::instrument(skip_all, err)]
    async fn load(&self) -> Result<(), LoaderError> {
        let mut m = HashMap::new();

        let Ok(connection) = MyraDbConnection::new().await else {
            return Err(LoaderError::DatabaseConnectionError);
        };

        let db = MyraDb::new(connection);

        let query = transaction_categories_queries::get_fee_enum_mappings();
        let models = db.fetch_all::<TransactionCategoryFeeEnumModel>(query).await;

        if let Ok(models) = models {
            for model in models {
                m.insert(model.enum_index, model.category_mapping);
            }
        } else {
            return Err(LoaderError::DatabaseQueryError);
        }

        FeeCategories::set_static_map(Some(m));
        Ok(())
    }

    fn get_expected_len(&self) -> usize {
        DatabaseFeeCategories::len()
    }
    fn get_loaded_len(&self) -> usize {
        let map = FeeCategories::get_static_map().lock().unwrap();
        map.as_ref().map_or(0, |m| m.len())
    }
}

impl DynamicEnum<DatabaseFeeCategories, i32> for FeeCategories {
    fn get_static_map() -> &'static Lazy<Mutex<Option<HashMap<DatabaseFeeCategories, i32>>>> {
        &FEE_CATEGORIES
    }

    fn set_static_map(map: Option<HashMap<DatabaseFeeCategories, i32>>) {
        let mut static_map = FEE_CATEGORIES.lock().unwrap();
        *static_map = map;
    }
}
