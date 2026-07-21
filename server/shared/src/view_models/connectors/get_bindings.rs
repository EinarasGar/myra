use super::base_models::ConnectorBindingViewModel;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetBindingsResponseViewModel {
    pub bindings: Vec<ConnectorBindingViewModel>,
}
