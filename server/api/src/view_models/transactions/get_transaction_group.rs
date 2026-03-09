use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use business::dtos::transaction_group_dto::TransactionGroupDto;

use crate::view_models::transactions::base_models::{
    category_id::RequiredCategoryId,
    description::Description,
    transaction_group::{
        IdentifiableTransactionGroup, RequiredIdentifiableTransactionGroupViewModel,
        RequiredTransactionGroupViewModel,
    },
    transaction_group_id::TransactionGroupId,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetTransactionGroupLineResponseViewModel {
    #[serde(flatten)]
    pub transaction_group: RequiredIdentifiableTransactionGroupViewModel,
}

impl TryFrom<TransactionGroupDto> for GetTransactionGroupLineResponseViewModel {
    type Error = anyhow::Error;

    fn try_from(dto: TransactionGroupDto) -> Result<Self, Self::Error> {
        let group_id = dto
            .group_id
            .ok_or_else(|| anyhow::anyhow!("TransactionGroupDto missing group_id"))?;

        Ok(GetTransactionGroupLineResponseViewModel {
            transaction_group: IdentifiableTransactionGroup {
                group_id: TransactionGroupId(group_id),
                group: RequiredTransactionGroupViewModel {
                    transactions: dto.transactions.into_iter().map(Into::into).collect(),
                    description: Description::from_trusted(dto.description),
                    category_id: RequiredCategoryId(dto.category_id),
                    date: dto.date,
                },
            },
        })
    }
}
