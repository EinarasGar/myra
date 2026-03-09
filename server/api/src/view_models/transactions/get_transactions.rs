use macros::type_tag;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use business::dtos::combined_transaction_dto::CombinedTransactionItem;

use super::{
    get_transaction_group::GetTransactionGroupLineResponseViewModel,
    transaction_types::RequiredIdentifiableTransactionWithIdentifiableEntries,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[serde(untagged)]
pub enum CombinedTransactionItemViewModel {
    Individual(IndividualTransactionItemViewModel),
    Group(GroupTransactionItemViewModel),
}

#[type_tag(value = "individual", tag = "item_type")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IndividualTransactionItemViewModel {
    #[serde(flatten)]
    pub transaction: RequiredIdentifiableTransactionWithIdentifiableEntries,
}

#[type_tag(value = "group", tag = "item_type")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GroupTransactionItemViewModel {
    #[serde(flatten)]
    pub group: GetTransactionGroupLineResponseViewModel,
}

impl TryFrom<CombinedTransactionItem> for CombinedTransactionItemViewModel {
    type Error = anyhow::Error;

    fn try_from(item: CombinedTransactionItem) -> Result<Self, Self::Error> {
        match item {
            CombinedTransactionItem::Individual(tx) => Ok(
                CombinedTransactionItemViewModel::Individual(IndividualTransactionItemViewModel {
                    item_type: Default::default(),
                    transaction: tx.into(),
                }),
            ),
            CombinedTransactionItem::Group(grp) => Ok(CombinedTransactionItemViewModel::Group(
                GroupTransactionItemViewModel {
                    item_type: Default::default(),
                    group: grp.try_into()?,
                },
            )),
        }
    }
}
