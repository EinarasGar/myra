use axum::Json;

use crate::{
    errors::ApiError, states::TransactionServiceState,
    view_models::category_view_model::CategoryViewModel,
};

#[tracing::instrument(skip_all, err)]
pub async fn get_categories(
    TransactionServiceState(transactions_service): TransactionServiceState,
) -> Result<Json<Vec<CategoryViewModel>>, ApiError> {
    let categories_vec = transactions_service.get_all_categories().await?;
    let ret_vec: Vec<CategoryViewModel> = categories_vec
        .iter()
        .map(|val| val.clone().into())
        .collect();
    Ok(ret_vec.into())
}
