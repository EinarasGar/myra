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

#[cfg(test)]
mod tests {
    use utoipa::OpenApi;

    use crate::openapi::ApiDoc;

    fn one_of_or_any_of<'a>(schema: &'a serde_json::Value) -> &'a Vec<serde_json::Value> {
        schema["oneOf"]
            .as_array()
            .or_else(|| schema["anyOf"].as_array())
            .expect("Schema should be represented as oneOf or anyOf")
    }

    #[test]
    fn combined_transactions_schema_uses_item_type_wrappers() {
        let spec = serde_json::from_str::<serde_json::Value>(
            &ApiDoc::openapi()
                .to_json()
                .expect("OpenAPI spec should serialize to JSON"),
        )
        .expect("OpenAPI JSON should deserialize into a serde_json::Value");

        let combined_items =
            one_of_or_any_of(&spec["components"]["schemas"]["CombinedTransactionItemViewModel"]);

        let schema_refs = combined_items
            .iter()
            .filter_map(|schema| schema["$ref"].as_str())
            .collect::<Vec<_>>();

        assert_eq!(
            schema_refs,
            vec![
                "#/components/schemas/IndividualTransactionItemViewModel",
                "#/components/schemas/GroupTransactionItemViewModel",
            ]
        );
        assert_eq!(
            spec["components"]["schemas"]["IndividualTransactionItemViewModel"]["allOf"][1]
                ["properties"]["item_type"]["enum"][0],
            "individual"
        );
        assert_eq!(
            spec["components"]["schemas"]["GroupTransactionItemViewModel"]["allOf"][1]
                ["properties"]["item_type"]["enum"][0],
            "group"
        );

        let transaction_variant_refs = one_of_or_any_of(
            &spec["components"]["schemas"]
                ["RequiredIdentifiableTransactionWithIdentifiableEntries"],
        )
        .iter()
        .filter_map(|schema| schema["$ref"].as_str())
        .collect::<Vec<_>>();

        assert!(transaction_variant_refs
            .iter()
            .all(|ref_path| !ref_path.contains("_TransactionBase_")));
        assert_eq!(
            transaction_variant_refs.first().copied(),
            Some("#/components/schemas/RequiredIdentifiableRegularTransaction")
        );
    }
}
