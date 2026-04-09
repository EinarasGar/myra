use serde::{Deserialize, Serialize};

#[cfg(feature = "backend")]
use business::dtos::transaction_group_dto::TransactionGroupDto;

#[cfg(feature = "backend")]
use crate::view_models::transactions::base_models::category_id::RequiredCategoryId;
#[cfg(feature = "backend")]
use crate::view_models::transactions::base_models::description::Description;
use crate::view_models::transactions::base_models::transaction_group::TransactionGroupWithId;
#[cfg(feature = "backend")]
use crate::view_models::transactions::base_models::transaction_group::{
    IdentifiableTransactionGroup, RequiredTransactionGroup,
};
#[cfg(feature = "backend")]
use crate::view_models::transactions::base_models::transaction_group_id::TransactionGroupId;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct GetTransactionGroupLineResponseViewModel {
    #[serde(flatten)]
    pub transaction_group: TransactionGroupWithId,
}

#[cfg(feature = "backend")]
impl TryFrom<TransactionGroupDto> for GetTransactionGroupLineResponseViewModel {
    type Error = anyhow::Error;

    fn try_from(dto: TransactionGroupDto) -> Result<Self, Self::Error> {
        let group_id = dto
            .group_id
            .ok_or_else(|| anyhow::anyhow!("TransactionGroupDto missing group_id"))?;

        Ok(GetTransactionGroupLineResponseViewModel {
            transaction_group: IdentifiableTransactionGroup {
                group_id: TransactionGroupId(group_id),
                group: RequiredTransactionGroup {
                    transactions: dto.transactions.into_iter().map(Into::into).collect(),
                    description: Description::from_trusted(dto.description),
                    category_id: RequiredCategoryId(dto.category_id),
                    date: dto.date,
                },
            },
        })
    }
}
