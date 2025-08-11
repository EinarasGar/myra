use std::collections::BTreeMap;

use utoipa::{
    openapi::{
        schema::{AnyOf, ArrayItems},
        security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
        RefOr, Schema,
    },
    Modify, OpenApi,
};

use crate::view_models::{
    accounts::base_models::{
        account_id::{AccountId, RequiredAccountId},
        account_type_id::AccountTypeId,
        liquidity_type_id::{LiquidityTypeId, RequiredLiquidityTypeId},
    },
    assets::base_models::{
        asset_id::{AssetId, RequiredAssetId},
        asset_type_id::{AssetTypeId, RequiredAssetTypeId},
    },
    errors::{ApiErrorResponse, AuthErrorResponse, ValidationError, ValidationErrorResponse},
    transactions::base_models::{
        category_id::{CategoryId, RequiredCategoryId},
        entry_id::{EntryId, RequiredEntryId},
        transaction_group_id::TransactionGroupId,
        transaction_id::{RequiredTransactionId, TransactionId},
    },
    users::base_models::user_id::{RequiredUserId, UserId},
};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Myra Personal Finance API",
        description = "A comprehensive personal finance management API for tracking investments, expenses, and net worth over time. Features include transaction management, portfolio tracking, asset management, and detailed financial reporting.",
        version = "1.0.0",
        contact(
            name = "API Support",
            email = "einaras.garbasauskas@gmail.com"
        )
    ),
    servers(
        (url = "http://localhost:5000", description = "Local development server")
    ),
    paths(
        super::handlers::transaction_groups::add_transaction_group,
        super::handlers::transaction_groups::update_transaction_group,
        super::handlers::transaction_groups::delete_transaction_group,
        super::handlers::transaction_groups::get_transaction_groups,
        super::handlers::transactions::update_transaction,
        super::handlers::transactions::delete_transaction,
        super::handlers::transactions::get_transactions,
        super::handlers::individual_transactions::add_individual_transaction,
        super::handlers::individual_transactions::update_individual_transaction,
        super::handlers::individual_transactions::get_individual_transactions,
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
        super::handlers::portfolio_handler::get_portfolio_overview,
    ),
    components(
        schemas(RequiredEntryId),
        schemas(EntryId),
        schemas(RequiredTransactionId),
        schemas(TransactionId),
        schemas(TransactionGroupId),
        schemas(AccountTypeId),
        schemas(RequiredAccountId),
        schemas(AccountId),
        schemas(RequiredLiquidityTypeId),
        schemas(LiquidityTypeId),
        schemas(RequiredAssetId),
        schemas(AssetId),
        schemas(RequiredAssetTypeId),
        schemas(AssetTypeId),
        schemas(RequiredCategoryId),
        schemas(CategoryId),
        schemas(RequiredUserId),
        schemas(UserId),
        schemas(ApiErrorResponse),
        schemas(ValidationErrorResponse),
        schemas(ValidationError),
        schemas(AuthErrorResponse),
    ),
    modifiers(
        // &TransformSchemasWithTag,
        &SecurityAddon,
        &DeriveDiscriminatorMapping,
        &OneOfToAnyOfTransformer,
        &NullableTypeReferenceTransformer,
    ),
    tags(
        (name = "Myra Personal Finance API", description = 
r#"# Myra Personal Finance API

A comprehensive REST API for personal finance management, enabling users to track investments, expenses, transactions, and monitor net worth over time.

## Key Features

- **Transaction Management**: Record and categorize financial transactions with support for various transaction types including purchases, sales, dividends, and transfers
- **Portfolio Tracking**: Monitor investment holdings and performance across multiple accounts
- **Asset Management**: Manage assets, asset pairs, and exchange rates for accurate portfolio valuation
- **Account Management**: Organize finances across different account types with varying liquidity levels
- **Net Worth Tracking**: Historical net worth calculations and trend analysis

## Authentication

This API uses JWT (JSON Web Token) authentication. To access protected endpoints:

1. **Login**: POST `/api/auth` with username and password
2. **Authorization**: Include the JWT token in the `Authorization: Bearer <token>` header for all subsequent requests
3. **Token Format**: Bearer tokens are in JWT format with configurable expiration

### Example Authentication Flow
```bash
# Get JWT token
curl -X POST /api/auth \\
  -H "Content-Type: application/json" \\
  -d '{"username": "your_username", "password": "your_password"}'

# Use token in requests
curl -H "Authorization: Bearer <your_jwt_token>" \\
  /api/users/{user_id}/accounts
```

# API Design Principles
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
                        .description(Some("JWT Bearer token obtained from the /api/auth endpoint. Include as 'Authorization: Bearer <token>' header.".to_string()))
                        .build(),
                ),
            )
        }
    }
}

pub struct DeriveDiscriminatorMapping;

impl Modify for DeriveDiscriminatorMapping {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let Some(components) = openapi.components.as_mut() else {
            return; // no components -> nothing to do
        };

        let mut schemas_to_update = BTreeMap::new();

        for (name, schema) in &components.schemas {
            let RefOr::T(Schema::OneOf(schema)) = schema else {
                continue; // only interested in oneOf schemas
            };

            let mut schema = schema.clone();
            let Some(discriminator) = schema.discriminator.as_mut() else {
                continue; // no discriminator -> nothing to do
            };

            if !discriminator.mapping.is_empty() {
                continue; // values already present
            }

            for child in &schema.items {
                let Some((child_schema, ref_or_title)) =
                    Self::child_schema(&components.schemas, child, None)
                else {
                    continue; // unable to lookup child schema
                };
                let Some(tag_name) =
                    Self::discriminator_tag_of_child(child_schema, &discriminator.property_name)
                else {
                    continue; // no tag name found -> we have to skip this child
                };
                // println!("tag_name: {:?}", tag_name);
                // println!("ref_or_title: {:?}", ref_or_title);

                discriminator.mapping.insert(tag_name, ref_or_title);
            }

            schemas_to_update.insert(name.clone(), RefOr::T(Schema::OneOf(schema)));
        }

        components.schemas.extend(schemas_to_update);
    }
}

impl DeriveDiscriminatorMapping {
    fn child_schema<'s>(
        schemas: &'s BTreeMap<String, RefOr<Schema>>,
        child: &'s RefOr<Schema>,
        ref_string: Option<String>,
    ) -> Option<(&'s Schema, String)> {
        match child {
            RefOr::T(schema) => {
                if let Some(ref_string) = ref_string {
                    return Some((schema, ref_string));
                }

                let title = match schema {
                    Schema::Array(o) => o.title.as_ref(),
                    Schema::Object(o) => o.title.as_ref(),
                    Schema::OneOf(o) => o.title.as_ref(),
                    Schema::AllOf(o) => o.title.as_ref(),
                    Schema::AnyOf(_) | _ => return None,
                }?
                .clone();
                // println!("child_schema: {:#?}", title);

                Some((schema, title))
            }
            RefOr::Ref(schema_ref) => {
                let (_, item_name) = schema_ref.ref_location.rsplit_once('/')?;

                let new_child = schemas.get(item_name)?;

                Self::child_schema(schemas, new_child, Some(schema_ref.ref_location.clone()))
            }
        }
    }
    fn discriminator_tag_of_child(item: &Schema, discriminator_field: &str) -> Option<String> {
        // get first object
        let child_properties = match item {
            Schema::Object(object) => Some(&object.properties),
            Schema::AllOf(allof) => {
                for item in &allof.items {
                    let RefOr::T(Schema::Object(object)) = item else {
                        continue;
                    };
                    if object.properties.contains_key(discriminator_field) {
                        let property = object.properties.get(discriminator_field)?;
                        let RefOr::T(Schema::Object(property)) = property else {
                            return None; // tags are always inlined as objects
                        };
                        let Some(enum_values) = &property.enum_values else {
                            return None; // no enum values -> we have to skip this child
                        };
                        let serde_json::Value::String(first_enum_value) = enum_values.first()?
                        else {
                            return None; // our expectation is to have exactly one enum value and it is a string
                        };
                        return Some(first_enum_value.clone());
                    }
                }
                None
            }
            Schema::AnyOf(_) | Schema::Array(_) | Schema::OneOf(_) | _ => None,
        }?;

        let property = child_properties.get(discriminator_field)?;

        let RefOr::T(Schema::Object(property)) = property else {
            return None; // tags are always inlined as objects
        };

        let Some(enum_values) = &property.enum_values else {
            return None; // no enum values -> we have to skip this child
        };

        let serde_json::Value::String(first_enum_value) = enum_values.first()? else {
            return None; // our expectation is to have exactly one enum value and it is a string
        };

        Some(first_enum_value.clone())
    }
}

pub struct OneOfToAnyOfTransformer;

/// This transformer converts OneOf schemas to AnyOf schemas.
/// This is due to a bug in redoc which fails to parse OneOf schema discriminator.
/// https://github.com/Redocly/redoc/issues/2252
impl Modify for OneOfToAnyOfTransformer {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let Some(components) = openapi.components.as_mut() else {
            return;
        };

        let mut schemas_to_update = BTreeMap::new();

        for (name, schema) in &components.schemas {
            let RefOr::T(Schema::OneOf(one_of_schema)) = schema else {
                continue;
            };

            let any_of = Schema::AnyOf(AnyOf {
                items: one_of_schema.items.clone(),
                schema_type: one_of_schema.schema_type.clone(),
                description: one_of_schema.description.clone(),
                default: one_of_schema.default.clone(),
                example: one_of_schema.example.clone(),
                examples: one_of_schema.examples.clone(),
                discriminator: one_of_schema.discriminator.clone(),
                extensions: one_of_schema.extensions.clone(),
            });

            schemas_to_update.insert(name.clone(), RefOr::T(any_of));
        }

        components.schemas.extend(schemas_to_update);
    }
}

pub struct NullableTypeReferenceTransformer;

impl Modify for NullableTypeReferenceTransformer {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let Some(components) = openapi.components.as_mut() else {
            return;
        };

        let mut schemas_to_update = BTreeMap::new();

        for (schema_name, schema) in &components.schemas {
            if let Some(updated_schema) =
                Self::fix_nullable_required_fields(schema, &components.schemas)
            {
                schemas_to_update.insert(schema_name.clone(), updated_schema);
            }
        }

        components.schemas.extend(schemas_to_update);
    }
}

impl NullableTypeReferenceTransformer {
    fn fix_nullable_required_fields(
        schema: &RefOr<Schema>,
        all_schemas: &BTreeMap<String, RefOr<Schema>>,
    ) -> Option<RefOr<Schema>> {
        match schema {
            RefOr::T(Schema::Object(obj)) => Self::process_object(obj, all_schemas),
            RefOr::T(Schema::AllOf(allof)) => {
                Self::process_schema_collection(&allof.items, all_schemas).map(|items| {
                    let mut new_allof = allof.clone();
                    new_allof.items = items;
                    RefOr::T(Schema::AllOf(new_allof))
                })
            }
            RefOr::T(Schema::OneOf(oneof)) => {
                Self::process_schema_collection(&oneof.items, all_schemas).map(|items| {
                    let mut new_oneof = oneof.clone();
                    new_oneof.items = items;
                    RefOr::T(Schema::OneOf(new_oneof))
                })
            }
            RefOr::T(Schema::AnyOf(anyof)) => {
                Self::process_schema_collection(&anyof.items, all_schemas).map(|items| {
                    let mut new_anyof = anyof.clone();
                    new_anyof.items = items;
                    RefOr::T(Schema::AnyOf(new_anyof))
                })
            }
            RefOr::T(Schema::Array(array)) => Self::process_array(array, all_schemas),
            _ => None,
        }
    }

    fn process_schema_collection(
        items: &[RefOr<Schema>],
        all_schemas: &BTreeMap<String, RefOr<Schema>>,
    ) -> Option<Vec<RefOr<Schema>>> {
        let mut new_items = Vec::new();
        let mut updated = false;

        for item in items {
            if let Some(fixed_item) = Self::fix_nullable_required_fields(item, all_schemas) {
                new_items.push(fixed_item);
                updated = true;
            } else {
                new_items.push(item.clone());
            }
        }

        updated.then_some(new_items)
    }

    fn process_object(
        object_schema: &utoipa::openapi::schema::Object,
        all_schemas: &BTreeMap<String, RefOr<Schema>>,
    ) -> Option<RefOr<Schema>> {
        let mut new_required = object_schema.required.clone();
        let mut new_properties = object_schema.properties.clone();
        let mut updated = false;

        for (prop_name, prop_schema) in &object_schema.properties {
            match prop_schema {
                RefOr::Ref(schema_ref) => {
                    if Self::should_remove_required_field(
                        schema_ref,
                        &object_schema.required,
                        prop_name,
                        all_schemas,
                    ) {
                        new_required.retain(|x| x != prop_name);
                        updated = true;
                    }
                }
                RefOr::T(_) => {
                    if let Some(fixed_prop) =
                        Self::fix_nullable_required_fields(prop_schema, all_schemas)
                    {
                        new_properties.insert(prop_name.clone(), fixed_prop);
                        updated = true;
                    }
                }
            }
        }

        updated.then(|| {
            let mut new_object = object_schema.clone();
            new_object.required = new_required;
            new_object.properties = new_properties;
            RefOr::T(Schema::Object(new_object))
        })
    }

    fn should_remove_required_field(
        schema_ref: &utoipa::openapi::Ref,
        required_fields: &[String],
        prop_name: &str,
        all_schemas: &BTreeMap<String, RefOr<Schema>>,
    ) -> bool {
        required_fields.contains(&prop_name.to_string())
            && schema_ref
                .ref_location
                .rsplit_once('/')
                .and_then(|(_, item_name)| all_schemas.get(item_name))
                .is_some_and(|schema| matches!(schema, RefOr::T(s) if Self::is_schema_nullable(s)))
    }

    fn process_array(
        array_schema: &utoipa::openapi::schema::Array,
        all_schemas: &BTreeMap<String, RefOr<Schema>>,
    ) -> Option<RefOr<Schema>> {
        match &array_schema.items {
            ArrayItems::RefOrSchema(ref_or_schema) => {
                Self::fix_nullable_required_fields(ref_or_schema, all_schemas).map(|fixed_items| {
                    let mut new_array = array_schema.clone();
                    new_array.items = ArrayItems::RefOrSchema(Box::new(fixed_items));
                    RefOr::T(Schema::Array(new_array))
                })
            }
            _ => None,
        }
    }

    fn is_schema_nullable(schema: &Schema) -> bool {
        if let Ok(json_value) = serde_json::to_value(schema) {
            if let Some(type_field) = json_value.get("type") {
                if let Some(type_array) = type_field.as_array() {
                    let has_null = type_array.iter().any(|t| t.as_str() == Some("null"));
                    let has_concrete_type = type_array.iter().any(|t| t.as_str() != Some("null"));
                    return has_null && has_concrete_type;
                }
            }
        }
        false
    }
}
