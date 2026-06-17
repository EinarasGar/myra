use serde::{Deserialize, Serialize};

use crate::view_models::accounts::base_models::account_identifier::AccountIdentifierViewModel;
use crate::view_models::accounts::base_models::ownership_share::OwnershipShare;

use super::base_models::account::AccountViewModel;
use super::base_models::liquidity_type_id::RequiredLiquidityTypeId;

#[cfg(feature = "backend")]
use crate::view_models::accounts::base_models::account_identifier::{
    identifiers_to_dtos, validate_identifiers,
};
#[cfg(feature = "backend")]
use crate::view_models::transactions::validation::Validatable;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct UpdateAccountViewModel {
    #[serde(flatten)]
    pub account: AccountViewModel,
    pub ownership_share: OwnershipShare,
    pub liquidity_type: RequiredLiquidityTypeId,
    #[serde(default)]
    pub identifiers: Vec<AccountIdentifierViewModel>,
}

#[cfg(feature = "backend")]
impl Validatable for UpdateAccountViewModel {
    fn validate(&self) -> Result<(), Vec<crate::errors::FieldError>> {
        validate_identifiers(&self.identifiers)
    }
}

#[cfg(feature = "backend")]
impl From<UpdateAccountViewModel>
    for business::dtos::accounts::account_amendment_dto::AccountAmendmentDto
{
    fn from(body: UpdateAccountViewModel) -> Self {
        Self {
            account_name: body.account.name.as_str().to_owned(),
            account_type: body.account.account_type.0,
            account_liquidity_type: body.liquidity_type.0,
            ownership_share: body.ownership_share.as_decimal(),
            identifiers: identifiers_to_dtos(&body.identifiers),
        }
    }
}
