use std::collections::BTreeMap;

use utoipa::{
    openapi::{
        schema::AdditionalProperties,
        security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
        Components, Discriminator, OneOfBuilder, Ref, RefOr, Response, Schema,
    },
    Modify, OpenApi,
};

use crate::view_models::{
    accounts::{
        add_account::{AddAccountRequestViewModel, AddAccountResponseViewModel},
        base_models::{
            account::{
                AccountViewModel, ExpandedAccountViewModel, IdentifiableAccountViewModel,
                IdentifiableExpandedAccountViewModel,
            },
            account_liquidity_type::IdentifiableAccountLiquidityTypeViewModel,
            account_type::{AccountTypeViewModel, IdentifiableAccountTypeViewModel},
            metadata_lookup::AccountMetadataLookupTables,
        },
        get_account::GetAccountResponseViewModel,
        get_account_liquidity_types::GetAccountLiquidityTypesResponseViewModel,
        get_account_types::GetAccountTypesResponseViewModel,
        get_accounts::{GetAccountsResponseViewModel, GetAccountsResponseViewModelRow},
        update_account::UpdateAccountViewModel,
    },
    assets::{
        add_asset::{AddAssetRequestViewModel, AddAssetResponseViewModel},
        add_asset_pair_rates::{
            AddAssetPairRatesRequestViewModel, AddAssetPairRatesResponseViewModel,
        },
        base_models::{
            asset::{AssetViewModel, IdentifiableAssetViewModel},
            asset_metadata::AssetMetadataViewModel,
            asset_pair_metadata::AssetPairMetadataViewModel,
            asset_type::IdentifiableAssetTypeViewModel,
            lookup::AssetLookupTables,
            rate::AssetRateViewModel,
            shared_asset_pair_metadata::SharedAssetPairMetadataViewModel,
            user_asset_pair_metadata::UserAssetPairMetadataViewModel,
        },
        get_asset::GetAssetResponseViewModel,
        get_asset_pair::GetAssetPairResponseViewModel,
        get_asset_pair_rates::GetAssetPairRatesResponseViewModel,
        get_assets::GetAssetsLineResponseViewModel,
        get_user_asset_pair::GetUserAssetPairResponseViewModel,
        update_asset::{UpdateAssetRequestViewModel, UpdateAssetResponseViewModel},
        update_asset_pair::{UpdateAssetPairRequestViewModel, UpdateAssetPairResponseViewModel},
    },
    authentication::{auth::AuthViewModel, login_details::LoginDetailsViewModel},
    base_models::search::PageOfAssetsResultsWithLookupViewModel,
    portfolio::{
        base_models::metadata_lookup::HoldingsMetadataLookupTables,
        get_holdings::{GetHoldingsResponseViewModel, GetHoldingsResponseViewModelRow},
        get_networth_history::GetNetWorthHistoryResponseViewModel,
    },
    transactions::{
        add_individual_transaction::{
            AddIndividualTransactionRequestViewModel, AddIndividualTransactionResponseViewModel,
        },
        add_transaction_group::{
            AddTransactionGroupRequestViewModel, AddTransactionGroupResponseViewModel,
        },
        base_models::{
            account_asset_entry::{
                AccountAssetEntryViewModel, IdentifiableAccountAssetEntryViewModel,
                MandatoryIdentifiableAccountAssetEntryViewModel,
            },
            metadata_lookup::MetadataLookupTables,
            transaction_base::{
                IdentifiableTransactionBaseWithIdentifiableEntries,
                MandatoryIdentifiableTransactionBaseWithIdentifiableEntries,
                MandatoryTransactionBaseWithIdentifiableEntries,
                TransactionBaseWithIdentifiableEntries,
            },
            transaction_fee::{
                IdentifiableTransactionFeeViewModel, TransactionFeeType, TransactionFeeViewModel,
            },
            transaction_group::{
                MandatoryIdentifiableTransactionGroupViewModel,
                TransactionGroupWithIdentifiableChildrenViewModel,
            },
        },
        get_individual_transaction::GetIndividualTransactionViewModel,
        get_individual_transactions::GetIndividualTransactionsViewModel,
        get_transaction_groups::GetTransactionGroupsViewModel,
        get_transactions::GetTransactionsViewModel,
        transaction_types::{
            account_fees::{
                AccountFeesViewModel, AccountFeesWithIdentifiableEntriesViewModel,
                IdentifiableAccountFeesWithIdentifiableEntriesViewModel,
                MandatoryAccountFeesWithIdentifiableEntriesViewModel,
            },
            asset_balance_transfer::{
                AssetBalanceTransferViewModel,
                AssetBalanceTransferWithIdentifiableEntriesViewModel,
                IdentifiableAssetBalanceTransferWithIdentifiableEntriesViewModel,
                MandatoryAssetBalanceTransferWithIdentifiableEntriesViewModel,
            },
            asset_dividend::{
                AssetDividendViewModel, AssetDividendWithIdentifiableEntriesViewModel,
                IdentifiableAssetDividendWithIdentifiableEntriesViewModel,
                MandatoryAssetDividendWithIdentifiableEntriesViewModel,
            },
            asset_purchase::{
                AssetPurchaseViewModel, AssetPurchaseWithIdentifiableEntriesViewModel,
                IdentifiableAssetPurchaseWithIdentifiableEntriesViewModel,
                MandatoryAssetPurchaseWithIdentifiableEntriesViewModel,
            },
            asset_sale::{
                AssetSaleViewModel, AssetSaleWithIdentifiableEntriesViewModel,
                IdentifiableAssetSaleWithIdentifiableEntriesViewModel,
                MandatoryAssetSaleWithIdentifiableEntriesViewModel,
            },
            asset_trade::{
                AssetTradeViewModel, AssetTradeWithIdentifiableEntriesViewModel,
                IdentifiableAssetTradeWithIdentifiableEntriesViewModel,
                MandatoryAssetTradeWithIdentifiableEntriesViewModel,
            },
            asset_transfer_in::{
                AssetTransferInViewModel, AssetTransferInWithIdentifiableEntriesViewModel,
                IdentifiableAssetTransferInWithIdentifiableEntriesViewModel,
                MandatoryAssetTransferInWithIdentifiableEntriesViewModel,
            },
            asset_transfer_out::{
                AssetTransferOutViewModel, AssetTransferOutWithIdentifiableEntriesViewModel,
                IdentifiableAssetTransferOutWithIdentifiableEntriesViewModel,
                MandatoryAssetTransferOutWithIdentifiableEntriesViewModel,
            },
            cash_dividend::{
                CashDividendViewModel, CashDividendWithIdentifiableEntriesViewModel,
                IdentifiableCashDividendWithIdentifiableEntriesViewModel,
                MandatoryCashDividendWithIdentifiableEntriesViewModel,
            },
            cash_transfer_in::{
                CashTransferInViewModel, CashTransferInWithIdentifiableEntriesViewModel,
                IdentifiableCashTransferInWithIdentifiableEntriesViewModel,
                MandatoryCashTransferInWithIdentifiableEntriesViewModel,
            },
            cash_transfer_out::{
                CashTransferOutViewModel, CashTransferOutWithIdentifiableEntriesViewModel,
                IdentifiableCashTransferOutWithIdentifiableEntriesViewModel,
                MandatoryCashTransferOutWithIdentifiableEntriesViewModel,
            },
            regular_transaction::{
                IdentifiableRegularTransactionWithIdentifiableEntriesViewModel,
                MandatoryRegularTransactionWithIdentifiableEntriesViewModel,
                RegularTransactionViewModel, RegularTransactionWithIdentifiableEntriesViewModel,
            },
            IdentifiableTransactionWithIdentifiableEntries,
            MandatoryIdentifiableTransactionWithIdentifiableEntries,
            MandatoryTransactionWithIdentifiableEntries, TransactionWithEntries,
            TransactionWithIdentifiableEntries,
        },
        update_individual_transaction::{
            UpdateIndividualTransactionRequestViewModel,
            UpdateIndividualTransactionResponseViewModel,
        },
        update_transaction::{
            UpdateTransactionRequestViewModel, UpdateTransactionResponseViewModel,
        },
        update_transaction_group::{
            UpdateTransactionGroupRequestViewModel, UpdateTransactionGroupResponseViewModel,
        },
    },
};

#[derive(OpenApi)]
#[openapi(
    paths(
        super::handlers::transaction_groups::add,
        super::handlers::transaction_groups::update,
        super::handlers::transaction_groups::delete,
        super::handlers::transaction_groups::get,
        super::handlers::transactions::update,
        super::handlers::transactions::delete,
        super::handlers::transactions::get,
        super::handlers::individual_transactions::add,
        super::handlers::individual_transactions::update,
        super::handlers::individual_transactions::get,
        super::handlers::individual_transactions::get_single,
        super::handlers::auth_handler::post_login_details,
        super::handlers::user_asset_handler::delete_asset,
        super::handlers::user_asset_handler::delete_asset_pair_rates,
        super::handlers::user_asset_handler::delete_asset_pair,
        super::handlers::user_asset_handler::post_custom_asset_rates,
        super::handlers::user_asset_handler::post_custom_asset,
        super::handlers::user_asset_handler::put_custom_asset,
        super::handlers::user_asset_handler::get_user_asset,
        super::handlers::user_asset_handler::get_user_asset_pair,
        super::handlers::user_asset_handler::get_user_asset_pair_rates,
        super::handlers::user_asset_handler::put_custom_asset_pair,
        super::handlers::asset_handler::get_asset,
        super::handlers::asset_handler::get_asset_pair,
        super::handlers::asset_handler::get_asset_pair_rates,
        super::handlers::asset_handler::search_assets,
        super::handlers::accounts_handler::get_account,
        super::handlers::accounts_handler::get_accounts,
        super::handlers::accounts_handler::update_account,
        super::handlers::accounts_handler::add_account,
        super::handlers::accounts_handler::delete_account,
        super::handlers::accounts_handler::get_account_types,
        super::handlers::accounts_handler::get_account_liquidity_types,
        super::handlers::portfolio_handler::get_networth_history,
        super::handlers::portfolio_handler::get_holdings,
        // search common assets
        // get user asset pair rates
        // get common asset pair rates
    ),
    components(
        // Transaction schemas
        schemas(AccountAssetEntryViewModel),
        schemas(AddIndividualTransactionRequestViewModel),
        schemas(AddIndividualTransactionResponseViewModel),
        schemas(AddTransactionGroupResponseViewModel),
        schemas(AddTransactionGroupRequestViewModel),
        schemas(GetIndividualTransactionsViewModel),
        schemas(GetTransactionGroupsViewModel),
        schemas(GetTransactionsViewModel),
        schemas(IdentifiableAccountAssetEntryViewModel),
        schemas(MandatoryIdentifiableAccountAssetEntryViewModel),
        schemas(MandatoryIdentifiableTransactionBaseWithIdentifiableEntries),
        schemas(IdentifiableRegularTransactionWithIdentifiableEntriesViewModel),
        schemas(IdentifiableTransactionBaseWithIdentifiableEntries),
        schemas(IdentifiableTransactionFeeViewModel),
        schemas(IdentifiableTransactionWithIdentifiableEntries),
        schemas(RegularTransactionViewModel),
        schemas(RegularTransactionWithIdentifiableEntriesViewModel),
        schemas(TransactionBaseWithIdentifiableEntries),
        schemas(TransactionFeeType),
        schemas(TransactionFeeViewModel),
        schemas(TransactionWithEntries),
        schemas(TransactionWithIdentifiableEntries),
        schemas(UpdateIndividualTransactionRequestViewModel),
        schemas(UpdateIndividualTransactionResponseViewModel),
        schemas(UpdateTransactionGroupRequestViewModel),
        schemas(UpdateTransactionGroupResponseViewModel),
        schemas(UpdateTransactionRequestViewModel),
        schemas(UpdateTransactionResponseViewModel),
        schemas(MetadataLookupTables),
        schemas(MandatoryIdentifiableTransactionWithIdentifiableEntries),
        schemas(MandatoryRegularTransactionWithIdentifiableEntriesViewModel),
        schemas(MandatoryTransactionWithIdentifiableEntries),
        schemas(TransactionGroupWithIdentifiableChildrenViewModel),
        schemas(MandatoryIdentifiableTransactionGroupViewModel),
        schemas(MandatoryTransactionBaseWithIdentifiableEntries),
        schemas(IdentifiableCashTransferOutWithIdentifiableEntriesViewModel),
        schemas(CashTransferOutViewModel),
        schemas(CashTransferOutWithIdentifiableEntriesViewModel),
        schemas(MandatoryCashTransferOutWithIdentifiableEntriesViewModel),
        schemas(IdentifiableCashTransferInWithIdentifiableEntriesViewModel),
        schemas(CashTransferInViewModel),
        schemas(CashTransferInWithIdentifiableEntriesViewModel),
        schemas(MandatoryCashTransferInWithIdentifiableEntriesViewModel),
        schemas(IdentifiableAssetSaleWithIdentifiableEntriesViewModel),
        schemas(AssetSaleViewModel),
        schemas(AssetSaleWithIdentifiableEntriesViewModel),
        schemas(MandatoryAssetSaleWithIdentifiableEntriesViewModel),
        schemas(IdentifiableCashDividendWithIdentifiableEntriesViewModel),
        schemas(CashDividendViewModel),
        schemas(CashDividendWithIdentifiableEntriesViewModel),
        schemas(MandatoryCashDividendWithIdentifiableEntriesViewModel),
        schemas(IdentifiableAssetTransferOutWithIdentifiableEntriesViewModel),
        schemas(AssetTransferOutViewModel),
        schemas(AssetTransferOutWithIdentifiableEntriesViewModel),
        schemas(MandatoryAssetTransferOutWithIdentifiableEntriesViewModel),
        schemas(IdentifiableAssetTransferInWithIdentifiableEntriesViewModel),
        schemas(AssetTransferInViewModel),
        schemas(AssetTransferInWithIdentifiableEntriesViewModel),
        schemas(MandatoryAssetTransferInWithIdentifiableEntriesViewModel),
        schemas(IdentifiableAssetTradeWithIdentifiableEntriesViewModel),
        schemas(AssetTradeViewModel),
        schemas(AssetTradeWithIdentifiableEntriesViewModel),
        schemas(MandatoryAssetTradeWithIdentifiableEntriesViewModel),
        schemas(IdentifiableAssetPurchaseWithIdentifiableEntriesViewModel),
        schemas(AssetPurchaseViewModel),
        schemas(AssetPurchaseWithIdentifiableEntriesViewModel),
        schemas(MandatoryAssetPurchaseWithIdentifiableEntriesViewModel),
        schemas(IdentifiableAssetDividendWithIdentifiableEntriesViewModel),
        schemas(AssetDividendViewModel),
        schemas(AssetDividendWithIdentifiableEntriesViewModel),
        schemas(MandatoryAssetDividendWithIdentifiableEntriesViewModel),
        schemas(IdentifiableAssetBalanceTransferWithIdentifiableEntriesViewModel),
        schemas(AssetBalanceTransferViewModel),
        schemas(AssetBalanceTransferWithIdentifiableEntriesViewModel),
        schemas(MandatoryAssetBalanceTransferWithIdentifiableEntriesViewModel),
        schemas(IdentifiableAccountFeesWithIdentifiableEntriesViewModel),
        schemas(AccountFeesViewModel),
        schemas(AccountFeesWithIdentifiableEntriesViewModel),
        schemas(MandatoryAccountFeesWithIdentifiableEntriesViewModel),
        schemas(GetIndividualTransactionViewModel),

        // Authentication schemas
        schemas(AuthViewModel),
        schemas(LoginDetailsViewModel),

        //Assets
        schemas(IdentifiableAssetViewModel),
        schemas(AssetViewModel),
        schemas(AssetRateViewModel),
        schemas(AddAssetPairRatesRequestViewModel),
        schemas(AddAssetPairRatesResponseViewModel),
        schemas(AddAssetRequestViewModel),
        schemas(AddAssetResponseViewModel),
        schemas(UpdateAssetRequestViewModel),
        schemas(UpdateAssetResponseViewModel),
        schemas(GetAssetResponseViewModel),
        schemas(GetAssetPairResponseViewModel),
        schemas(GetAssetPairRatesResponseViewModel),
        schemas(UpdateAssetPairRequestViewModel),
        schemas(UpdateAssetPairResponseViewModel),
        schemas(PageOfAssetsResultsWithLookupViewModel),
        schemas(IdentifiableAssetTypeViewModel),
        schemas(AssetMetadataViewModel),
        schemas(AssetLookupTables),
        schemas(GetAssetsLineResponseViewModel),
        schemas(SharedAssetPairMetadataViewModel),
        schemas(UserAssetPairMetadataViewModel),
        schemas(GetUserAssetPairResponseViewModel),
        schemas(AssetPairMetadataViewModel),

        // Accounts
        schemas(GetAccountResponseViewModel),
        schemas(GetAccountsResponseViewModel),
        schemas(IdentifiableAccountViewModel),
        schemas(IdentifiableExpandedAccountViewModel),
        schemas(ExpandedAccountViewModel),
        schemas(AccountViewModel),
        schemas(AccountTypeViewModel),
        schemas(IdentifiableAccountTypeViewModel),
        schemas(GetAccountsResponseViewModelRow),
        schemas(AccountMetadataLookupTables),
        schemas(IdentifiableAccountLiquidityTypeViewModel),
        schemas(AddAccountRequestViewModel),
        schemas(AddAccountResponseViewModel),
        schemas(UpdateAccountViewModel),
        schemas(GetAccountTypesResponseViewModel),
        schemas(GetAccountLiquidityTypesResponseViewModel),

        // Portfolio
        schemas(GetNetWorthHistoryResponseViewModel),
        schemas(GetHoldingsResponseViewModelRow),
        schemas(GetHoldingsResponseViewModel),
        schemas(HoldingsMetadataLookupTables),

    ),
    modifiers(
        &TransformSchemasWithTag,
        &SecurityAddon
    ),
    tags(
        (name = "Myra", description = 
r#"# What is Myra?
somethings something financial tracking tool

# Authentication
something something authentication

# API Design principles
The API design _tries_ to follow the same design principles across all contracts.

## Object relationships
### Identification
Each entity has an identification, whether or not it is returned in response object is determined by the use case.
- If we are querying a list of entities, the identification is always returned.
- If we are querying a single entity, the is identification for the entity not returned in the response object, as it is used in query path. However, the identification for related entities is returned.
- If we are creating a new entity using POST - the identification the entity and all its relationships is returned in response object.
- If we are updating a single entity  the is identification for the entity not returned in the response object, as it is used in query path. However, the identification for related entities is returned.

### Input data
If we are querying an endpoint which has some object relationships, for input data (Request body, params or path), we provide only the `id` of the related object. 

This is because in order to update or fetch something related, the assumption is that for the correct decision, the client mut have already up to date data about the related objects.

Example of this would be that if we want to update an asset to a different category, we would pass the category `id` and not the whole category object, as we would have known it before hand.

### Response contracts
For the relationships in response contracts, there are multiple approaches:
- For responses which contain many objects with some kind of relationship, a lookup table is provided as part of the root response.
For example, if we are querying a lot of arbitrary transactions, the response would contain a `metadata` object which would contain the `account` and `asset` lookup tables. This is to avoid duplication of the same object in the response.
```js
GET /api/assets
{
    list: [
        {
            id: 1,
            name: "name",
            relationship: 5,
        }
    ],
    lookup_tables: {
        relationship: [
               { id: 5, name: "relationship_name"}
            ]
        }
    }
}
```
- For queries, where only a single entity is returned without nested objects of array type, the relationship is expanded inplace.
For example, if we query for a specific asset, the asset type would be returned as an object instead of the `id`.
This is because the consumer could not know the necessary metadata beforehand and providing a lookup table for a single entity is not gud.
```js
GET /api/assets/1
{
    id: 1,
    name: "name",
    relationship: {
        id: 5,
        name: "relationship_name"
    }
}
```
- For queries where we are adding or updating data, we do not provide any lookup or expansion. The reason is the same as for input data - the client should have the necessary data to make the correct decision beforehand, so returning the same metadata is irrelevant.
```js
POST /api/assets
{
    id: 1,
    name: "name",
    relationship: 5,
}
```
- For queries that have recursion, lookup or expansion is not provided. This is to avoid ambiguity caused by recursion. 
For example, if we query the asset entity, we get a list of related assets. If we were to expand the related assets, it would cause ambiguity for the client 
as to how the rest of the objects are expanded.
```js
GET /api/assets/1
{
    id: 1,
    name: "name",
    related_asset: 2
}
```




"#)
    )
)]
pub struct ApiDoc;

// Code copied from https://github.com/geo-engine/geoengine/blob/main/services/src/util/apidoc.rs
pub struct TransformSchemasWithTag;

impl TransformSchemasWithTag {
    fn get_variant_tag<'a>(schema: &'a Schema, discriminator: &String) -> Option<&'a str> {
        match schema {
            Schema::Object(obj) => {
                obj.properties
                    .get(discriminator)
                    .and_then(|ref_or| match ref_or {
                        RefOr::T(Schema::Object(prop)) => {
                            prop.enum_values.as_ref().and_then(|enum_values| {
                                enum_values.first().and_then(serde_json::Value::as_str)
                            })
                        }
                        _ => None,
                    })
            }
            Schema::AllOf(ao) => ao.items.iter().find_map(|item| match item {
                RefOr::Ref(_) => None,
                RefOr::T(concrete) => Self::get_variant_tag(concrete, discriminator),
            }),
            _ => None,
        }
    }

    fn trim_ref_location(reference: &Ref) -> &str {
        const SCHEMA_REF_PREFIX_LEN: usize = "#/components/schemas/".len();
        &reference.ref_location[SCHEMA_REF_PREFIX_LEN..]
    }

    fn get_base_type_name(schema: &Schema) -> Option<&str> {
        match schema {
            Schema::AllOf(ao) => ao.items.iter().find_map(|item| match item {
                RefOr::Ref(reference) => Some(Self::trim_ref_location(reference)),
                RefOr::T(_) => None,
            }),
            _ => None,
        }
    }

    fn uppercase_first_letter(s: &str) -> String {
        let mut chars = s.chars();
        match chars.next() {
            None => String::new(),
            Some(c1) => c1.to_uppercase().collect::<String>() + chars.as_str(),
        }
    }

    fn flatten_allof(
        schema: &Schema,
        all_schemas: &BTreeMap<String, RefOr<Schema>>,
    ) -> Option<Schema> {
        match schema {
            Schema::AllOf(ao) => {
                let reference = Self::get_base_type_name(schema)?;
                let Some(RefOr::T(Schema::Object(referenced_object))) = all_schemas.get(reference)
                else {
                    return None;
                };
                let mut obj_with_discrimator_prop =
                    ao.items.iter().find_map(|item| match item {
                        RefOr::T(Schema::Object(concrete)) => Some(concrete.clone()),
                        _ => None,
                    })?;
                let mut final_obj = referenced_object.clone();
                final_obj
                    .properties
                    .append(&mut obj_with_discrimator_prop.properties);
                final_obj
                    .required
                    .append(&mut obj_with_discrimator_prop.required);
                Some(Schema::Object(final_obj))
            }
            _ => None,
        }
    }
}

impl Modify for TransformSchemasWithTag {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let old_components = openapi.components.as_ref().unwrap();
        let old_schemas = &old_components.schemas;
        let mut new_schemas = old_schemas.clone();

        'outer: for (schema_name, ref_or) in old_schemas {
            let RefOr::T(schema) = ref_or else {
                continue;
            };
            let Schema::OneOf(one_of) = schema else {
                continue;
            };
            let Some(Discriminator {
                property_name: discriminator,
                ..
            }) = &one_of.discriminator
            else {
                continue;
            };
            let mut items: Vec<&Schema> = Vec::new();

            for item in &one_of.items {
                match item {
                    RefOr::Ref(_) => continue 'outer,
                    RefOr::T(concrete) => items.push(concrete),
                }
            }
            let mut new_discriminator = Discriminator::new(discriminator.clone());
            let mut one_of_builder = OneOfBuilder::new();

            for item in items {
                let Some(variant_tag) = Self::get_variant_tag(item, discriminator) else {
                    continue 'outer;
                };
                let variant_schema_name = match Self::get_base_type_name(item) {
                    Some(base_type) => format!(
                        "{}With{}",
                        base_type,
                        Self::uppercase_first_letter(discriminator),
                    ),
                    None => format!(
                        "{}{}",
                        Self::uppercase_first_letter(variant_tag),
                        schema_name
                    ),
                };

                if let Some(flattened) = Self::flatten_allof(item, old_schemas) {
                    new_schemas.insert(variant_schema_name.clone(), flattened.into());
                } else {
                    new_schemas.insert(variant_schema_name.clone(), item.clone().into());
                }

                let reference = Ref::from_schema_name(variant_schema_name.clone());
                new_discriminator
                    .mapping
                    .insert(variant_tag.to_string(), reference.ref_location.clone());
                one_of_builder = one_of_builder.item(reference);
            }
            one_of_builder = one_of_builder.discriminator(Some(new_discriminator));

            new_schemas.insert(schema_name.clone(), one_of_builder.into());
        }
        let mut new_components = old_components.clone();
        new_components.schemas = new_schemas;
        openapi.components = Some(new_components);
    }
}

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "auth_token",
                SecurityScheme::Http(
                    HttpBuilder::new()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .build(),
                ),
            )
        }
    }
}

/// Recursively checks that schemas referenced in the given schema object exist in the provided map.
fn can_resolve_schema(schema: &RefOr<Schema>, components: &Components) {
    match schema {
        RefOr::Ref(reference) => {
            can_resolve_reference(reference, components);
        }
        RefOr::T(concrete) => match concrete {
            Schema::Array(arr) => {
                can_resolve_schema(arr.items.as_ref(), components);
            }
            Schema::Object(obj) => {
                for property in obj.properties.values() {
                    can_resolve_schema(property, components);
                }
                if let Some(additional_properties) = &obj.additional_properties {
                    if let AdditionalProperties::RefOr(properties_schema) =
                        additional_properties.as_ref()
                    {
                        can_resolve_schema(properties_schema, components);
                    }
                }
            }
            Schema::OneOf(oo) => {
                for item in &oo.items {
                    can_resolve_schema(item, components);
                }
            }
            Schema::AllOf(ao) => {
                for item in &ao.items {
                    can_resolve_schema(item, components);
                }
            }
            _ => panic!("Unknown schema type"),
        },
    }
}

/// Recursively checks that schemas referenced in the given response object exist in the provided map.
fn can_resolve_response(response: &RefOr<Response>, components: &Components) {
    match response {
        RefOr::Ref(reference) => {
            can_resolve_reference(reference, components);
        }
        RefOr::T(concrete) => {
            for content in concrete.content.values() {
                can_resolve_schema(&content.schema, components);
            }
        }
    }
}

/// Checks that the given reference can be resolved using the provided map.
fn can_resolve_reference(reference: &Ref, components: &Components) {
    const SCHEMA_REF_PREFIX: &str = "#/components/schemas/";
    const RESPONSE_REF_PREFIX: &str = "#/components/responses/";

    if reference.ref_location.starts_with(SCHEMA_REF_PREFIX) {
        let schema_name = &reference.ref_location[SCHEMA_REF_PREFIX.len()..];

        match components.schemas.get(schema_name) {
            None => assert!(
                components.schemas.contains_key(schema_name),
                "Referenced the unknown schema `{schema_name}`"
            ),
            Some(resolved) => can_resolve_schema(resolved, components),
        }
    } else if reference.ref_location.starts_with(RESPONSE_REF_PREFIX) {
        let response_name = &reference.ref_location[RESPONSE_REF_PREFIX.len()..];

        match components.responses.get(response_name) {
            None => assert!(
                components.responses.contains_key(response_name),
                "Referenced the unknown response `{response_name}`"
            ),
            Some(resolved) => can_resolve_response(resolved, components),
        }
    } else {
        panic!("Invalid reference type");
    }
}

/// Loops through all registered HTTP handlers and ensures that the referenced schemas
/// (inside of request bodies, parameters or responses) exist and can be resolved.
///
/// # Panics
///
/// Panics if a referenced schema cannot be resolved.
///
pub fn can_resolve_api(api: utoipa::openapi::OpenApi) {
    let components = api.components.expect("api has at least one component");

    for path_item in api.paths.paths.into_values() {
        for operation in path_item.operations.into_values() {
            if let Some(request_body) = operation.request_body {
                for content in request_body.content.into_values() {
                    can_resolve_schema(&content.schema, &components);
                }
            }

            if let Some(parameters) = operation.parameters {
                for parameter in parameters {
                    if let Some(schema) = parameter.schema {
                        can_resolve_schema(&schema, &components);
                    }
                }
            }

            for response in operation.responses.responses.into_values() {
                match response {
                    RefOr::Ref(reference) => {
                        can_resolve_reference(&reference, &components);
                    }
                    RefOr::T(concrete) => {
                        for content in concrete.content.into_values() {
                            can_resolve_schema(&content.schema, &components);
                        }
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_resolve_api() {
        crate::openapi::can_resolve_api(ApiDoc::openapi());
    }
}
