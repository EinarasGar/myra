use std::collections::BTreeMap;

use utoipa::{
    openapi::{
        schema::AnyOf,
        security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
        RefOr, Schema,
    },
    Modify,
};

pub(super) struct SecurityAddon;

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

pub(super) struct DeriveDiscriminatorMapping;

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

pub(super) struct OneOfToAnyOfTransformer;

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
