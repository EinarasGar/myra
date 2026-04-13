use shared::view_models::base_models::search::SearchCategoriesResponseViewModel;

use crate::models::CategoryItem;

pub fn extract_categories(body: &str) -> Result<Vec<CategoryItem>, String> {
    let page: SearchCategoriesResponseViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(page
        .results
        .into_iter()
        .map(|row| CategoryItem {
            id: row.id.0,
            name: row.category.category.into_inner(),
        })
        .collect())
}
