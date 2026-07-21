use super::base_models::ConnectorConnectionViewModel;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetConnectionsResponseViewModel {
    pub connections: Vec<ConnectorConnectionViewModel>,
}
