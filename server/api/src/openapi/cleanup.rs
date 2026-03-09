use std::collections::{BTreeMap, BTreeSet};

use serde_json::{Map, Value};

const TRANSACTION_UNION_RENAMES: &[(&str, &str)] = &[
    ("TransactionWithEntries", "TransactionInput"),
    (
        "TransactionWithIdentifiableEntries",
        "TransactionWithEntryIds",
    ),
    (
        "IdentifiableTransactionWithIdentifiableEntries",
        "IdentifiableTransaction",
    ),
    (
        "RequiredTransactionWithIdentifiableEntries",
        "RequiredTransaction",
    ),
    (
        "RequiredIdentifiableTransactionWithIdentifiableEntries",
        "RequiredIdentifiableTransaction",
    ),
];

// Structural canonical names for generator-emitted transaction entry wrappers.
// If transaction entry or fee item shapes change, update these names or detection rules.
const TRANSACTION_ENTRY_COMPONENT_NAMES: (&str, &str, &str) = (
    "TransactionEntry",
    "TransactionEntryWithEntryId",
    "TransactionEntryWithRequiredEntryId",
);
const TRANSACTION_FEE_ITEM_COMPONENT_NAMES: (&str, &str, &str) = (
    "TransactionFeeItem",
    "TransactionFeeItemWithEntryId",
    "TransactionFeeItemWithRequiredEntryId",
);

const ERROR_RESPONSE_NAMES: &[(&str, &str, &str)] = &[
    ("401", "Invalid credentials", "InvalidCredentialsError"),
    ("401", "Unauthorized access", "UnauthorizedError"),
    (
        "403",
        "Forbidden — authenticated but not authorised for this resource",
        "ForbiddenError",
    ),
    ("404", "Resource not found", "NotFoundError"),
    ("422", "Validation error", "ValidationError"),
    ("500", "Internal server error", "InternalServerError"),
];

const PARAMETER_ANNOTATION_FIELDS: &[&str] = &["description", "summary", "example", "examples"];
const PAYLOAD_SCHEMA_PREFIXES: &[&str] = &["Add", "Create", "Update"];
const PAYLOAD_SCHEMA_SUFFIXES: &[&str] = &["Request", "Response", "ViewModel"];
const SCHEMA_NAME_PENALTY_TOKENS: &[&str] = &[
    "Request",
    "Response",
    "ViewModel",
    "Row",
    "Create",
    "Add",
    "Get",
    "Update",
    "Delete",
    "Required",
];
const HTTP_OPERATION_KEYS: &[&str] = &[
    "get", "put", "post", "delete", "options", "head", "patch", "trace",
];
const INLINEABLE_SCHEMA_TYPES: &[&str] = &["string", "integer", "number", "boolean", "null"];
const INLINEABLE_SCHEMA_FIELDS: &[&str] = &[
    "type",
    "format",
    "description",
    "pattern",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "minLength",
    "maxLength",
    "default",
    "example",
    "examples",
    "deprecated",
    "readOnly",
    "writeOnly",
];

pub(super) struct OpenApiDocumentCleanup;

impl OpenApiDocumentCleanup {
    pub(super) fn to_pretty_json(openapi: utoipa::openapi::OpenApi) -> String {
        let document = Self::clean_document(openapi, true);
        serde_json::to_string_pretty(&document)
            .expect("Failed to serialize cleaned OpenAPI document to JSON")
    }

    fn clean_document(
        openapi: utoipa::openapi::OpenApi,
        include_parameter_components: bool,
    ) -> Value {
        let mut document = serde_json::to_value(openapi)
            .expect("Failed to serialize OpenAPI document before cleanup");

        while Self::normalize_document(&mut document) {}

        Self::promote_common_inline_object_schemas(&mut document);
        Self::rename_schema_components(&mut document);
        Self::inline_trivial_schema_refs(&mut document);
        Self::collapse_ref_alias_schemas(&mut document);
        Self::collapse_duplicate_complex_schemas(&mut document);
        Self::collapse_documentation_only_schema_duplicates(&mut document);
        Self::hoist_common_path_item_parameters(&mut document);
        if include_parameter_components {
            Self::promote_common_parameters(&mut document);
        }
        Self::sanitize_operation_ids(&mut document);
        Self::hoist_global_security_requirement(&mut document);
        Self::promote_common_error_responses(&mut document);
        Self::remove_empty_info_license(&mut document);
        Self::fold_unused_overview_tag_into_info(&mut document);
        Self::remove_unused_component_schemas(&mut document);

        document
    }

    pub(super) fn normalize_document(document: &mut Value) -> bool {
        let schema_lookup = Self::schema_lookup(document);
        Self::normalize_value(document, &schema_lookup)
    }

    fn normalize_value(value: &mut Value, schema_lookup: &BTreeMap<String, Value>) -> bool {
        let mut changed = false;

        match value {
            Value::Array(items) => {
                for item in items {
                    changed |= Self::normalize_value(item, schema_lookup);
                }
            }
            Value::Object(object) => {
                for child in object.values_mut() {
                    changed |= Self::normalize_value(child, schema_lookup);
                }

                if let Some(collapsed) =
                    Self::collapse_single_branch_composition(object, schema_lookup)
                {
                    *value = collapsed;
                    return true;
                }

                if let Some(flattened) = Self::flatten_object_all_of(object, schema_lookup) {
                    *value = flattened;
                    return true;
                }

                if let Some(nullable_union) =
                    Self::collapse_simple_nullable_union(object, schema_lookup)
                {
                    *value = nullable_union;
                    return true;
                }

                changed |= Self::strip_invalid_default(object, schema_lookup);
                changed |= Self::strip_impossible_nullable_all_of_branch(object, schema_lookup);
            }
            Value::Null | Value::Bool(_) | Value::Number(_) | Value::String(_) => {}
        }

        changed
    }

    fn collapse_single_branch_composition(
        object: &Map<String, Value>,
        schema_lookup: &BTreeMap<String, Value>,
    ) -> Option<Value> {
        for keyword in ["allOf", "oneOf", "anyOf"] {
            let Some(branches) = object.get(keyword).and_then(Value::as_array) else {
                continue;
            };

            if branches.len() != 1 {
                continue;
            }

            return Self::merge_single_branch_wrapper(
                object,
                keyword,
                branches[0].clone(),
                schema_lookup,
            );
        }

        None
    }

    fn merge_single_branch_wrapper(
        object: &Map<String, Value>,
        keyword: &str,
        branch: Value,
        schema_lookup: &BTreeMap<String, Value>,
    ) -> Option<Value> {
        let mut wrapper = object.clone();
        wrapper.remove(keyword);

        Self::merge_schema_wrapper(wrapper, branch, schema_lookup)
    }

    fn merge_schema_wrapper(
        wrapper: Map<String, Value>,
        branch: Value,
        schema_lookup: &BTreeMap<String, Value>,
    ) -> Option<Value> {
        if wrapper.is_empty() {
            return Some(branch);
        }

        let branch = match branch {
            Value::Object(ref branch_object) if Self::is_plain_ref(branch_object) => {
                let ref_name = Self::ref_name(branch_object.get("$ref")?.as_str()?)?;
                schema_lookup.get(&ref_name)?.clone()
            }
            other => other,
        };

        let Value::Object(mut merged) = branch else {
            return None;
        };

        for (key, value) in wrapper {
            match merged.get_mut(&key) {
                None => {
                    merged.insert(key, value);
                }
                Some(existing) if *existing == value => {}
                Some(existing) => match (key.as_str(), existing.clone(), value) {
                    (
                        "description" | "default" | "example" | "examples" | "title",
                        _,
                        override_value,
                    ) => {
                        *existing = override_value;
                    }
                    ("required", Value::Array(existing_items), Value::Array(new_items)) => {
                        *existing =
                            Value::Array(Self::merge_unique_values(existing_items, new_items));
                    }
                    ("properties", Value::Object(mut existing_props), Value::Object(new_props)) => {
                        existing_props.extend(new_props);
                        *existing = Value::Object(existing_props);
                    }
                    _ => return None,
                },
            }
        }

        Some(Value::Object(merged))
    }

    fn collapse_simple_nullable_union(
        object: &Map<String, Value>,
        schema_lookup: &BTreeMap<String, Value>,
    ) -> Option<Value> {
        for keyword in ["oneOf", "anyOf"] {
            let Some(branches) = object.get(keyword).and_then(Value::as_array) else {
                continue;
            };
            if branches.len() != 2 {
                continue;
            }

            let mut non_null_branch = None;
            let mut saw_null = false;

            for branch in branches {
                if Self::is_null_schema(branch) {
                    saw_null = true;
                } else if non_null_branch.is_none() {
                    non_null_branch = Some(branch.clone());
                } else {
                    non_null_branch = None;
                    break;
                }
            }

            if !saw_null {
                continue;
            }

            let Some(nullable_branch) = non_null_branch
                .as_ref()
                .and_then(|branch| Self::inline_simple_nullable_branch(branch, schema_lookup))
            else {
                continue;
            };

            let mut wrapper = object.clone();
            wrapper.remove(keyword);
            return Self::merge_schema_wrapper(
                wrapper,
                Value::Object(nullable_branch),
                schema_lookup,
            );
        }

        None
    }

    fn inline_simple_nullable_branch(
        branch: &Value,
        schema_lookup: &BTreeMap<String, Value>,
    ) -> Option<Map<String, Value>> {
        let mut expanded = Self::expand_ref_schema(branch, schema_lookup, &mut BTreeSet::new())?
            .as_object()?
            .clone();

        if expanded.contains_key("allOf")
            || expanded.contains_key("anyOf")
            || expanded.contains_key("oneOf")
            || expanded.contains_key("not")
            || expanded.contains_key("properties")
            || expanded.contains_key("additionalProperties")
            || expanded.contains_key("items")
        {
            return None;
        }

        if !Self::append_null_to_schema_type(&mut expanded) {
            return None;
        }

        Some(expanded)
    }

    fn expand_ref_schema(
        schema: &Value,
        schema_lookup: &BTreeMap<String, Value>,
        visited_refs: &mut BTreeSet<String>,
    ) -> Option<Value> {
        let Value::Object(schema_object) = schema else {
            return None;
        };

        let Some(ref_path) = schema_object.get("$ref").and_then(Value::as_str) else {
            return Some(Value::Object(schema_object.clone()));
        };

        let ref_name = Self::ref_name(ref_path)?;
        if !visited_refs.insert(ref_name.clone()) {
            return None;
        }

        let Some(resolved) = schema_lookup
            .get(&ref_name)
            .and_then(|value| Self::expand_ref_schema(value, schema_lookup, visited_refs))
        else {
            visited_refs.remove(&ref_name);
            return None;
        };
        visited_refs.remove(&ref_name);

        let mut siblings = schema_object.clone();
        siblings.remove("$ref");

        Self::merge_schema_wrapper(siblings, resolved, schema_lookup)
    }

    fn append_null_to_schema_type(schema: &mut Map<String, Value>) -> bool {
        if let Some(enum_values) = schema.get_mut("enum").and_then(Value::as_array_mut) {
            if !enum_values.iter().any(Value::is_null) {
                enum_values.push(Value::Null);
            }
        }

        match schema.get_mut("type") {
            Some(Value::String(schema_type)) if schema_type == "null" => true,
            Some(Value::String(schema_type)) => {
                let original = std::mem::take(schema_type);
                *schema.get_mut("type").expect("type should still exist") = Value::Array(vec![
                    Value::String(original),
                    Value::String("null".to_string()),
                ]);
                true
            }
            Some(Value::Array(types)) => {
                let has_null = types
                    .iter()
                    .any(|schema_type| schema_type.as_str() == Some("null"));
                if !has_null {
                    types.push(Value::String("null".to_string()));
                }
                true
            }
            Some(_) => false,
            None => schema
                .get("enum")
                .and_then(Value::as_array)
                .is_some_and(|enum_values| !enum_values.is_empty()),
        }
    }

    fn strip_invalid_default(
        object: &mut Map<String, Value>,
        schema_lookup: &BTreeMap<String, Value>,
    ) -> bool {
        let Some(default) = object.get("default").cloned() else {
            return false;
        };

        if Self::schema_accepts_value(
            &Value::Object(object.clone()),
            &default,
            schema_lookup,
            &mut BTreeSet::new(),
        ) {
            return false;
        }

        object.remove("default").is_some()
    }

    fn strip_impossible_nullable_all_of_branch(
        object: &mut Map<String, Value>,
        schema_lookup: &BTreeMap<String, Value>,
    ) -> bool {
        let Some(all_of) = object.get_mut("allOf").and_then(Value::as_array_mut) else {
            return false;
        };

        if all_of.len() < 2 {
            return false;
        }

        if !all_of
            .iter()
            .any(|schema| !Self::schema_allows_null(schema, schema_lookup, &mut BTreeSet::new()))
        {
            return false;
        }

        let mut changed = false;

        for schema in all_of.iter_mut() {
            if let Some(non_nullable_branch) = Self::extract_nullable_branch(schema) {
                *schema = non_nullable_branch;
                changed = true;
            }
        }

        changed
    }

    fn flatten_object_all_of(
        object: &Map<String, Value>,
        schema_lookup: &BTreeMap<String, Value>,
    ) -> Option<Value> {
        let all_of = object.get("allOf").and_then(Value::as_array)?;
        if all_of.len() < 2 {
            return None;
        }

        let mut merged = Map::new();

        for branch in all_of {
            Self::merge_object_schema(&mut merged, branch, schema_lookup, &mut BTreeSet::new())?;
        }

        let mut wrapper = object.clone();
        wrapper.remove("allOf");

        if !wrapper.is_empty() {
            Self::merge_object_schema(
                &mut merged,
                &Value::Object(wrapper),
                schema_lookup,
                &mut BTreeSet::new(),
            )?;
        }

        if !merged.contains_key("type")
            && (merged.contains_key("properties")
                || merged.contains_key("required")
                || merged.contains_key("additionalProperties"))
        {
            merged.insert("type".to_string(), Value::String("object".to_string()));
        }

        Some(Value::Object(merged))
    }

    fn merge_object_schema(
        target: &mut Map<String, Value>,
        schema: &Value,
        schema_lookup: &BTreeMap<String, Value>,
        visited_refs: &mut BTreeSet<String>,
    ) -> Option<()> {
        let schema_object = schema.as_object()?;

        if let Some(ref_path) = schema_object.get("$ref").and_then(Value::as_str) {
            let ref_name = Self::ref_name(ref_path)?;
            if !visited_refs.insert(ref_name.clone()) {
                return None;
            }

            let result = schema_lookup.get(&ref_name).and_then(|resolved| {
                Self::merge_object_schema(target, resolved, schema_lookup, visited_refs)
            });
            visited_refs.remove(&ref_name);
            return result;
        }

        if schema_object.contains_key("oneOf")
            || schema_object.contains_key("anyOf")
            || schema_object.contains_key("not")
        {
            return None;
        }

        if let Some(branches) = schema_object.get("allOf").and_then(Value::as_array) {
            for branch in branches {
                Self::merge_object_schema(target, branch, schema_lookup, visited_refs)?;
            }
        }

        for (key, value) in schema_object {
            match key.as_str() {
                "$ref" | "allOf" => {}
                "type" => {
                    let merged_type = match target.get("type") {
                        Some(existing) => Self::merge_object_type(existing, value)?,
                        None => value.clone(),
                    };
                    target.insert(key.clone(), merged_type);
                }
                "required" => {
                    let merged_required =
                        match (target.remove("required"), value.as_array().cloned()) {
                            (Some(Value::Array(existing)), Some(new_items)) => {
                                Value::Array(Self::merge_unique_values(existing, new_items))
                            }
                            (None, Some(new_items)) => Value::Array(new_items),
                            (Some(existing), _) => {
                                target.insert("required".to_string(), existing);
                                return None;
                            }
                            (None, None) => return None,
                        };
                    target.insert("required".to_string(), merged_required);
                }
                "properties" => {
                    let Some(new_properties) = value.as_object() else {
                        return None;
                    };

                    let mut merged_properties = match target.remove("properties") {
                        Some(Value::Object(existing)) => existing,
                        None => Map::new(),
                        Some(existing) => {
                            target.insert("properties".to_string(), existing);
                            return None;
                        }
                    };

                    for (property_name, property_schema) in new_properties {
                        match merged_properties.get_mut(property_name) {
                            None => {
                                merged_properties
                                    .insert(property_name.clone(), property_schema.clone());
                            }
                            Some(existing) if *existing == *property_schema => {}
                            Some(existing) => {
                                Self::merge_duplicate_schema_value(
                                    existing,
                                    property_schema.clone(),
                                )?;
                            }
                        }
                    }

                    target.insert("properties".to_string(), Value::Object(merged_properties));
                }
                "description" | "title" | "example" | "examples" => match target.get(key) {
                    None => {
                        target.insert(key.clone(), value.clone());
                    }
                    Some(existing) if existing == value => {}
                    Some(_) => {}
                },
                _ => match target.get(key) {
                    None => {
                        target.insert(key.clone(), value.clone());
                    }
                    Some(existing) if existing == value => {}
                    Some(_) => return None,
                },
            }
        }

        Some(())
    }

    fn merge_duplicate_schema_value(existing: &mut Value, new_value: Value) -> Option<()> {
        if *existing == new_value {
            return Some(());
        }

        let (Value::Object(existing_object), Value::Object(new_object)) = (existing, new_value)
        else {
            return None;
        };

        if existing_object.get("$ref") != new_object.get("$ref") {
            return None;
        }

        for (key, value) in new_object {
            match existing_object.get(&key) {
                None => {
                    existing_object.insert(key, value);
                }
                Some(existing_value) if *existing_value == value => {}
                Some(_)
                    if matches!(
                        key.as_str(),
                        "description" | "title" | "example" | "examples"
                    ) => {}
                Some(_) => return None,
            }
        }

        Some(())
    }

    fn merge_object_type(existing: &Value, new_value: &Value) -> Option<Value> {
        let existing_types = Self::type_set(existing)?;
        let new_types = Self::type_set(new_value)?;

        if !existing_types
            .iter()
            .all(|value| value == "object" || value == "null")
            || !new_types
                .iter()
                .all(|value| value == "object" || value == "null")
            || !existing_types.contains("object")
            || !new_types.contains("object")
        {
            return None;
        }

        let intersection: Vec<String> = existing_types.intersection(&new_types).cloned().collect();

        if intersection.is_empty() {
            return None;
        }

        if intersection.len() == 1 && intersection[0] == "object" {
            return Some(Value::String("object".to_string()));
        }

        Some(Value::Array(
            intersection.into_iter().map(Value::String).collect(),
        ))
    }

    fn type_set(value: &Value) -> Option<BTreeSet<String>> {
        match value {
            Value::String(schema_type) => Some(BTreeSet::from([schema_type.clone()])),
            Value::Array(schema_types) => schema_types
                .iter()
                .map(|schema_type| schema_type.as_str().map(ToOwned::to_owned))
                .collect(),
            _ => None,
        }
    }

    fn extract_nullable_branch(schema: &Value) -> Option<Value> {
        let schema_object = schema.as_object()?;

        for keyword in ["oneOf", "anyOf"] {
            let branches = schema_object.get(keyword)?.as_array()?;
            if branches.len() != 2 {
                continue;
            }

            let mut non_null_branch = None;
            let mut saw_null = false;

            for branch in branches {
                if Self::is_null_schema(branch) {
                    saw_null = true;
                } else if non_null_branch.is_none() {
                    non_null_branch = Some(branch.clone());
                } else {
                    return None;
                }
            }

            if saw_null {
                return non_null_branch;
            }
        }

        None
    }

    fn schema_accepts_value(
        schema: &Value,
        value: &Value,
        schema_lookup: &BTreeMap<String, Value>,
        visited_refs: &mut BTreeSet<String>,
    ) -> bool {
        let Some(schema_object) = schema.as_object() else {
            return true;
        };

        if let Some(ref_path) = schema_object.get("$ref").and_then(Value::as_str) {
            let Some(ref_name) = Self::ref_name(ref_path) else {
                return true;
            };

            if !visited_refs.insert(ref_name.clone()) {
                return true;
            }

            let result = schema_lookup.get(&ref_name).is_none_or(|target| {
                Self::schema_accepts_value(target, value, schema_lookup, visited_refs)
            });
            visited_refs.remove(&ref_name);
            return result;
        }

        if let Some(enum_values) = schema_object.get("enum").and_then(Value::as_array) {
            return enum_values.iter().any(|item| item == value);
        }

        for keyword in ["oneOf", "anyOf"] {
            if let Some(branches) = schema_object.get(keyword).and_then(Value::as_array) {
                return branches.iter().any(|branch| {
                    Self::schema_accepts_value(branch, value, schema_lookup, visited_refs)
                });
            }
        }

        if let Some(branches) = schema_object.get("allOf").and_then(Value::as_array) {
            return branches.iter().all(|branch| {
                Self::schema_accepts_value(branch, value, schema_lookup, visited_refs)
            });
        }

        match schema_object.get("type") {
            Some(Value::String(schema_type)) => Self::value_matches_type(schema_type, value),
            Some(Value::Array(types)) => types.iter().any(|schema_type| {
                schema_type
                    .as_str()
                    .is_some_and(|schema_type| Self::value_matches_type(schema_type, value))
            }),
            _ => true,
        }
    }

    fn schema_allows_null(
        schema: &Value,
        schema_lookup: &BTreeMap<String, Value>,
        visited_refs: &mut BTreeSet<String>,
    ) -> bool {
        let Some(schema_object) = schema.as_object() else {
            return false;
        };

        if let Some(ref_path) = schema_object.get("$ref").and_then(Value::as_str) {
            let Some(ref_name) = Self::ref_name(ref_path) else {
                return false;
            };

            if !visited_refs.insert(ref_name.clone()) {
                return false;
            }

            let result = schema_lookup.get(&ref_name).is_some_and(|target| {
                Self::schema_allows_null(target, schema_lookup, visited_refs)
            });
            visited_refs.remove(&ref_name);
            return result;
        }

        match schema_object.get("type") {
            Some(Value::String(schema_type)) => return schema_type == "null",
            Some(Value::Array(types)) => {
                return types
                    .iter()
                    .any(|schema_type| schema_type.as_str() == Some("null"));
            }
            _ => {}
        }

        if schema_object
            .get("enum")
            .and_then(Value::as_array)
            .is_some_and(|items| items.iter().any(Value::is_null))
        {
            return true;
        }

        for keyword in ["oneOf", "anyOf"] {
            if let Some(branches) = schema_object.get(keyword).and_then(Value::as_array) {
                return branches
                    .iter()
                    .any(|branch| Self::schema_allows_null(branch, schema_lookup, visited_refs));
            }
        }

        if let Some(branches) = schema_object.get("allOf").and_then(Value::as_array) {
            return branches
                .iter()
                .all(|branch| Self::schema_allows_null(branch, schema_lookup, visited_refs));
        }

        false
    }

    pub(super) fn rename_schema_components(document: &mut Value) {
        let schema_lookup = Self::schema_lookup(document);
        if schema_lookup.is_empty() {
            return;
        }

        let mut rename_desires = BTreeMap::new();
        Self::collect_transaction_variant_renames(document, &mut rename_desires);

        for (schema_name, schema) in &schema_lookup {
            if rename_desires.contains_key(schema_name) {
                continue;
            }

            if let Some(schema_object) = schema.as_object() {
                if let Some(new_name) =
                    Self::structural_schema_component_name(schema_object, &schema_lookup)
                {
                    rename_desires.insert(schema_name.clone(), new_name);
                    continue;
                }
            }

            if let Some(new_name) = Self::generic_schema_component_name(schema_name) {
                rename_desires.insert(schema_name.clone(), new_name);
            }
        }

        if rename_desires.is_empty() {
            return;
        }

        let original_schema_names: BTreeSet<String> = schema_lookup.keys().cloned().collect();
        let rename_map = Self::resolve_component_rename_map(&original_schema_names, rename_desires);
        Self::rename_components(document, "schemas", &rename_map);
    }

    pub(super) fn promote_common_inline_object_schemas(document: &mut Value) {
        let existing_names = Self::component_names(document, "schemas");

        let mut occurrences = BTreeMap::new();
        Self::collect_inline_object_schema_occurrences(document, "", &mut occurrences);

        let repeated_schemas: Vec<(String, Vec<String>)> = occurrences
            .into_iter()
            .filter(|(_, pointers)| pointers.len() > 1)
            .collect();

        if repeated_schemas.is_empty() {
            return;
        }

        let mut used_names = existing_names;
        let mut promoted_components = Map::new();
        let mut promotion_map = BTreeMap::new();

        for (serialized_schema, pointers) in repeated_schemas {
            let Some(Value::Object(schema)) =
                serde_json::from_str::<Value>(&serialized_schema).ok()
            else {
                continue;
            };

            let desired_name = Self::shared_schema_component_name(&pointers);
            let component_name = Self::unique_component_name(&desired_name, &mut used_names);
            promoted_components.insert(component_name.clone(), Value::Object(schema));
            promotion_map.insert(serialized_schema, component_name);
        }

        if promoted_components.is_empty() {
            return;
        }

        let Some(document_object) = document.as_object_mut() else {
            return;
        };
        let Some(schemas) = Self::ensure_component_map_mut(document_object, "schemas") else {
            return;
        };
        schemas.extend(promoted_components);

        Self::replace_inline_object_schemas_with_refs(document, "", &promotion_map);
    }

    fn collect_inline_object_schema_occurrences(
        value: &Value,
        pointer: &str,
        occurrences: &mut BTreeMap<String, Vec<String>>,
    ) {
        match value {
            Value::Array(items) => {
                for (index, item) in items.iter().enumerate() {
                    let child_pointer = format!("{pointer}/{}", index);
                    Self::collect_inline_object_schema_occurrences(
                        item,
                        &child_pointer,
                        occurrences,
                    );
                }
            }
            Value::Object(object) => {
                if Self::is_promotable_inline_object_schema(pointer, object) {
                    if let Ok(serialized) = serde_json::to_string(value) {
                        occurrences
                            .entry(serialized)
                            .or_default()
                            .push(pointer.to_string());
                    }
                }

                for (key, child) in object {
                    let child_pointer =
                        format!("{pointer}/{}", Self::escape_json_pointer_segment(key));
                    Self::collect_inline_object_schema_occurrences(
                        child,
                        &child_pointer,
                        occurrences,
                    );
                }
            }
            Value::Null | Value::Bool(_) | Value::Number(_) | Value::String(_) => {}
        }
    }

    fn replace_inline_object_schemas_with_refs(
        value: &mut Value,
        pointer: &str,
        promotion_map: &BTreeMap<String, String>,
    ) {
        match value {
            Value::Array(items) => {
                for (index, item) in items.iter_mut().enumerate() {
                    let child_pointer = format!("{pointer}/{}", index);
                    Self::replace_inline_object_schemas_with_refs(
                        item,
                        &child_pointer,
                        promotion_map,
                    );
                }
            }
            Value::Object(object) => {
                if Self::is_promotable_inline_object_schema(pointer, object) {
                    if let Ok(serialized) = serde_json::to_string(&Value::Object(object.clone())) {
                        if let Some(component_name) = promotion_map.get(&serialized) {
                            *value = Value::Object(Map::from_iter([(
                                "$ref".to_string(),
                                Value::String(Self::schema_ref(component_name)),
                            )]));
                            return;
                        }
                    }
                }

                for (key, child) in object.iter_mut() {
                    let child_pointer =
                        format!("{pointer}/{}", Self::escape_json_pointer_segment(key));
                    Self::replace_inline_object_schemas_with_refs(
                        child,
                        &child_pointer,
                        promotion_map,
                    );
                }
            }
            Value::Null | Value::Bool(_) | Value::Number(_) | Value::String(_) => {}
        }
    }

    fn is_promotable_inline_object_schema(pointer: &str, object: &Map<String, Value>) -> bool {
        if object.contains_key("$ref") || !object.contains_key("properties") {
            return false;
        }

        !Self::is_top_level_component_schema_pointer(pointer)
    }

    fn is_top_level_component_schema_pointer(pointer: &str) -> bool {
        let segments = Self::json_pointer_segments(pointer);
        segments.len() == 3 && segments[0] == "components" && segments[1] == "schemas"
    }

    fn shared_schema_component_name(pointers: &[String]) -> String {
        let mut candidate_names = pointers
            .iter()
            .map(|pointer| Self::inline_schema_tail_name(pointer))
            .collect::<Vec<_>>();
        candidate_names.sort_by_key(|candidate| (candidate.len(), candidate.clone()));
        candidate_names
            .into_iter()
            .find(|candidate| candidate != "NestedObject")
            .unwrap_or_else(|| "SharedObject".to_string())
    }

    fn collect_transaction_variant_renames(
        document: &Value,
        rename_desires: &mut BTreeMap<String, String>,
    ) {
        for (union_name, renamed_union_name) in TRANSACTION_UNION_RENAMES {
            if let Some(mapping) = document
                .get("components")
                .and_then(|components| components.get("schemas"))
                .and_then(|schemas| schemas.get(union_name))
                .and_then(Value::as_object)
                .and_then(|schema| schema.get("discriminator"))
                .and_then(Value::as_object)
                .and_then(|discriminator| discriminator.get("mapping"))
                .and_then(Value::as_object)
            {
                for (tag, ref_path) in mapping {
                    let Some(ref_path) = ref_path.as_str() else {
                        continue;
                    };
                    let Some(old_name) = Self::ref_name(ref_path) else {
                        continue;
                    };
                    rename_desires.insert(
                        old_name,
                        format!("{}{}", Self::pascal_case(tag), renamed_union_name),
                    );
                }
            }
        }
    }

    fn generic_schema_component_name(schema_name: &str) -> Option<String> {
        Self::rename_transaction_union_schema(schema_name)
            .or_else(|| Self::rename_page_schema(schema_name))
            .or_else(|| Self::trim_schema_noise_suffix(schema_name))
            .or_else(|| Self::compact_schema_name(schema_name))
    }

    fn structural_schema_component_name(
        schema: &Map<String, Value>,
        schema_lookup: &BTreeMap<String, Value>,
    ) -> Option<String> {
        if Self::is_transaction_fee_item_schema(schema) {
            return Some(Self::entry_id_variant_component_name(
                schema,
                schema_lookup,
                TRANSACTION_FEE_ITEM_COMPONENT_NAMES,
            ));
        }

        if Self::is_transaction_entry_schema(schema) {
            return Some(Self::entry_id_variant_component_name(
                schema,
                schema_lookup,
                TRANSACTION_ENTRY_COMPONENT_NAMES,
            ));
        }

        None
    }

    fn rename_transaction_union_schema(schema_name: &str) -> Option<String> {
        TRANSACTION_UNION_RENAMES
            .iter()
            .find(|(original_name, _)| *original_name == schema_name)
            .map(|(_, renamed_name)| (*renamed_name).to_string())
    }

    fn rename_page_schema(schema_name: &str) -> Option<String> {
        let schema_name = schema_name
            .strip_prefix("PageOfResults_")
            .or_else(|| schema_name.strip_prefix("CursorOrPageOfResults_"))?;
        let schema_name = schema_name
            .strip_suffix("_MetadataLookupTables")
            .or_else(|| schema_name.strip_suffix("_AssetLookupTables"))?;
        let schema_name =
            Self::trim_schema_noise_suffix(schema_name).unwrap_or_else(|| schema_name.to_string());

        Some(format!("{schema_name}Page"))
    }

    fn trim_schema_noise_suffix(schema_name: &str) -> Option<String> {
        for (suffix, replacement) in [
            ("RequestViewModel", "Request"),
            ("ResponseViewModel", "Response"),
            ("ViewModel", ""),
        ] {
            let Some(prefix) = schema_name.strip_suffix(suffix) else {
                continue;
            };

            let trimmed = format!("{prefix}{replacement}");
            if trimmed != schema_name && !trimmed.is_empty() {
                return Some(trimmed);
            }
        }

        None
    }

    fn compact_schema_name(schema_name: &str) -> Option<String> {
        if let Some(rest) = schema_name.strip_prefix("RequiredIdentifiable") {
            let base = format!("Required{rest}");
            return Some(Self::append_schema_identity_suffix(&base));
        }

        if let Some(rest) = schema_name.strip_prefix("Identifiable") {
            return Some(Self::append_schema_identity_suffix(rest));
        }

        None
    }

    fn append_schema_identity_suffix(base: &str) -> String {
        if base.contains("With") {
            format!("{base}AndId")
        } else {
            format!("{base}WithId")
        }
    }

    fn entry_id_variant_component_name(
        schema: &Map<String, Value>,
        schema_lookup: &BTreeMap<String, Value>,
        names: (&str, &str, &str),
    ) -> String {
        let (without_entry_id, nullable_entry_id, required_entry_id) = names;
        let Some(entry_id_schema) = schema
            .get("properties")
            .and_then(Value::as_object)
            .and_then(|properties| properties.get("entry_id"))
        else {
            return without_entry_id.to_string();
        };

        if Self::schema_allows_null(entry_id_schema, schema_lookup, &mut BTreeSet::new()) {
            nullable_entry_id.to_string()
        } else {
            required_entry_id.to_string()
        }
    }

    fn is_transaction_entry_schema(schema: &Map<String, Value>) -> bool {
        matches!(
            Self::schema_property_names(schema),
            Some(ref property_names)
                if matches!(
                    property_names.as_slice(),
                    ["account_id", "amount", "asset_id"]
                        | ["account_id", "amount", "asset_id", "entry_id"]
                )
        )
    }

    fn is_transaction_fee_item_schema(schema: &Map<String, Value>) -> bool {
        matches!(
            Self::schema_property_names(schema),
            Some(ref property_names)
                if matches!(
                    property_names.as_slice(),
                    ["account_id", "amount", "asset_id", "fee_type"]
                        | ["account_id", "amount", "asset_id", "entry_id", "fee_type"]
                )
        )
    }

    fn schema_property_names(schema: &Map<String, Value>) -> Option<Vec<&str>> {
        let properties = schema.get("properties")?.as_object()?;
        let mut names = properties
            .keys()
            .map(|name| name.as_str())
            .collect::<Vec<_>>();
        names.sort_unstable();
        Some(names)
    }

    fn schema_value_allows_null(schema: &Value) -> bool {
        let Some(object) = schema.as_object() else {
            return false;
        };

        if object
            .get("nullable")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            return true;
        }

        if matches!(object.get("type"), Some(Value::String(schema_type)) if schema_type == "null") {
            return true;
        }

        if object
            .get("type")
            .and_then(Value::as_array)
            .is_some_and(|types| {
                types
                    .iter()
                    .filter_map(Value::as_str)
                    .any(|schema_type| schema_type == "null")
            })
        {
            return true;
        }

        for keyword in ["oneOf", "anyOf"] {
            if object
                .get(keyword)
                .and_then(Value::as_array)
                .is_some_and(|branches| branches.iter().any(Self::schema_value_allows_null))
            {
                return true;
            }
        }

        false
    }

    fn inline_schema_tail_name(pointer: &str) -> String {
        let segments = Self::json_pointer_segments(pointer);
        let mut tail = String::new();
        let mut index = 0;

        while index < segments.len() {
            match segments[index].as_str() {
                "properties" => {
                    let Some(property_name) = segments.get(index + 1) else {
                        break;
                    };
                    tail = Self::pascal_case(property_name);
                    index += 2;
                }
                "items" => {
                    tail = if tail.is_empty() {
                        "Item".to_string()
                    } else {
                        format!("{}Item", Self::singularize_pascal_case(&tail))
                    };
                    index += 1;
                }
                "additionalProperties" => {
                    if tail.is_empty() {
                        tail = "Value".to_string();
                    } else {
                        tail.push_str("Value");
                    }
                    index += 1;
                }
                _ => index += 1,
            }
        }

        if tail.is_empty() {
            "NestedObject".to_string()
        } else {
            tail
        }
    }

    fn singularize_pascal_case(value: &str) -> String {
        value
            .strip_suffix("ies")
            .map(|prefix| format!("{prefix}y"))
            .or_else(|| value.strip_suffix('s').map(ToOwned::to_owned))
            .unwrap_or_else(|| value.to_string())
    }

    fn json_pointer_segments(pointer: &str) -> Vec<String> {
        pointer
            .strip_prefix('/')
            .map(|pointer| {
                pointer
                    .split('/')
                    .map(|segment| segment.replace("~1", "/").replace("~0", "~"))
                    .collect()
            })
            .unwrap_or_default()
    }

    fn escape_json_pointer_segment(segment: &str) -> String {
        segment.replace('~', "~0").replace('/', "~1")
    }

    fn unique_component_name(desired_name: &str, used_names: &mut BTreeSet<String>) -> String {
        if used_names.insert(desired_name.to_string()) {
            return desired_name.to_string();
        }

        let mut counter = 2;
        loop {
            let candidate = format!("{desired_name}{counter}");
            if used_names.insert(candidate.clone()) {
                return candidate;
            }
            counter += 1;
        }
    }

    fn resolve_component_rename_map(
        original_names: &BTreeSet<String>,
        rename_desires: BTreeMap<String, String>,
    ) -> BTreeMap<String, String> {
        if rename_desires.is_empty() {
            return BTreeMap::new();
        }

        let renaming_names: BTreeSet<String> = rename_desires.keys().cloned().collect();
        let mut used_names: BTreeSet<String> = original_names
            .difference(&renaming_names)
            .cloned()
            .collect();

        rename_desires
            .into_iter()
            .map(|(old_name, desired_name)| {
                (
                    old_name,
                    Self::unique_component_name(&desired_name, &mut used_names),
                )
            })
            .collect()
    }

    fn rename_components(
        document: &mut Value,
        component_kind: &str,
        rename_map: &BTreeMap<String, String>,
    ) {
        if rename_map.is_empty() {
            return;
        }

        {
            let Some(components) = Self::component_map_mut(document, component_kind) else {
                return;
            };

            let original_components = components.clone();
            let mut renamed_components = Map::new();

            for (component_name, component) in original_components {
                let target_name = rename_map
                    .get(&component_name)
                    .cloned()
                    .unwrap_or(component_name);
                renamed_components.insert(target_name, component);
            }

            *components = renamed_components;
        }

        Self::replace_component_ref_strings(document, component_kind, rename_map);
    }

    fn replace_component_ref_strings(
        document: &mut Value,
        component_kind: &str,
        rename_map: &BTreeMap<String, String>,
    ) {
        match document {
            Value::Array(items) => {
                for item in items {
                    Self::replace_component_ref_strings(item, component_kind, rename_map);
                }
            }
            Value::Object(object) => {
                for value in object.values_mut() {
                    Self::replace_component_ref_strings(value, component_kind, rename_map);
                }
            }
            Value::String(string) => {
                if let Some(component_name) = Self::component_ref_name(string, component_kind) {
                    if let Some(new_name) = rename_map.get(&component_name) {
                        *string = Self::component_ref(component_kind, new_name);
                    }
                }
            }
            Value::Null | Value::Bool(_) | Value::Number(_) => {}
        }
    }

    pub(super) fn hoist_global_security_requirement(document: &mut Value) {
        let Some(paths) = document.get("paths").and_then(Value::as_object) else {
            return;
        };

        let mut security_counts: BTreeMap<String, (usize, Value)> = BTreeMap::new();
        for path_item in paths.values() {
            let Some(path_item) = path_item.as_object() else {
                continue;
            };

            for operation in path_item.values() {
                let Some(operation) = operation.as_object() else {
                    continue;
                };
                let Some(security) = operation.get("security") else {
                    continue;
                };
                let key = security.to_string();
                let entry = security_counts
                    .entry(key)
                    .or_insert_with(|| (0, security.clone()));
                entry.0 += 1;
            }
        }

        let non_empty_security = security_counts
            .into_values()
            .filter(|(_, security)| !matches!(security, Value::Array(items) if items.is_empty()))
            .collect::<Vec<_>>();

        let common_security = if non_empty_security.len() == 1 {
            non_empty_security
                .into_iter()
                .next()
                .map(|(_, security)| security)
        } else {
            non_empty_security
                .into_iter()
                .filter(|(count, _)| *count > 1)
                .max_by_key(|(count, _)| *count)
                .map(|(_, security)| security)
        };

        let Some(common_security) = common_security else {
            return;
        };

        let Some(document_object) = document.as_object_mut() else {
            return;
        };
        document_object.insert("security".to_string(), common_security.clone());

        let Some(paths) = document_object
            .get_mut("paths")
            .and_then(Value::as_object_mut)
        else {
            return;
        };

        for path_item in paths.values_mut() {
            let Some(path_item) = path_item.as_object_mut() else {
                continue;
            };

            for operation in path_item.values_mut() {
                let Some(operation) = operation.as_object_mut() else {
                    continue;
                };

                match operation.get("security") {
                    Some(security) if *security == common_security => {
                        operation.remove("security");
                    }
                    Some(_) => {}
                    None => {
                        if !Self::operation_signals_protected_resource(operation) {
                            operation.insert("security".to_string(), Value::Array(Vec::new()));
                        }
                    }
                }
            }
        }
    }

    pub(super) fn sanitize_operation_ids(document: &mut Value) {
        let Some(paths) = document.get_mut("paths").and_then(Value::as_object_mut) else {
            return;
        };

        let mut operations = paths
            .iter()
            .flat_map(|(path, path_item)| {
                path_item
                    .as_object()
                    .into_iter()
                    .flat_map(|path_item| {
                        path_item
                            .keys()
                            .filter(|key| Self::is_http_operation_key(key))
                            .map(|method| (path.clone(), method.clone()))
                            .collect::<Vec<_>>()
                    })
                    .collect::<Vec<_>>()
            })
            .collect::<Vec<_>>();
        operations.sort();

        let mut used_operation_ids = BTreeSet::new();

        for (path, method) in operations {
            let Some(operation) = paths
                .get_mut(&path)
                .and_then(Value::as_object_mut)
                .and_then(|path_item| path_item.get_mut(&method))
                .and_then(Value::as_object_mut)
            else {
                continue;
            };

            let existing_id = operation
                .get("operationId")
                .and_then(Value::as_str)
                .map(ToOwned::to_owned);

            if existing_id
                .as_deref()
                .is_some_and(Self::is_generator_friendly_operation_id)
                && existing_id
                    .as_ref()
                    .is_some_and(|operation_id| used_operation_ids.insert(operation_id.clone()))
            {
                continue;
            }

            let desired_id = existing_id
                .as_deref()
                .map(Self::snake_case_identifier)
                .filter(|operation_id| !operation_id.is_empty())
                .unwrap_or_else(|| Self::operation_id_from_path(&method, &path));
            let operation_id = Self::unique_component_name(&desired_id, &mut used_operation_ids);

            operation.insert("operationId".to_string(), Value::String(operation_id));
        }
    }

    fn promote_common_error_responses(document: &mut Value) {
        let Some(document_object) = document.as_object_mut() else {
            return;
        };
        let Some(paths) = document_object
            .get_mut("paths")
            .and_then(Value::as_object_mut)
        else {
            return;
        };

        let mut response_components = Map::new();

        for path_item in paths.values_mut() {
            let Some(path_item) = path_item.as_object_mut() else {
                continue;
            };

            for operation in path_item.values_mut() {
                let Some(operation) = operation.as_object_mut() else {
                    continue;
                };
                let Some(responses) = operation
                    .get_mut("responses")
                    .and_then(Value::as_object_mut)
                else {
                    continue;
                };

                for (status_code, response) in responses.iter_mut() {
                    let Some(response_object) = response.as_object() else {
                        continue;
                    };
                    if response_object.contains_key("$ref")
                        || !Self::is_api_error_response(response_object)
                    {
                        continue;
                    }

                    let Some(description) =
                        response_object.get("description").and_then(Value::as_str)
                    else {
                        continue;
                    };

                    let response_name =
                        Self::error_response_component_name(status_code, description);
                    response_components
                        .entry(response_name.clone())
                        .or_insert_with(|| Value::Object(response_object.clone()));

                    let mut response_ref = Map::new();
                    response_ref.insert(
                        "$ref".to_string(),
                        Value::String(Self::response_ref(&response_name)),
                    );
                    *response = Value::Object(response_ref);
                }
            }
        }

        if response_components.is_empty() {
            return;
        }

        let Some(responses) = Self::ensure_component_map_mut(document_object, "responses") else {
            return;
        };

        responses.extend(response_components);
    }

    fn collapse_ref_alias_schemas(document: &mut Value) {
        let schema_lookup = Self::schema_lookup(document);
        if schema_lookup.is_empty() {
            return;
        }

        let direct_aliases: BTreeMap<String, String> = schema_lookup
            .iter()
            .filter_map(|(schema_name, schema)| {
                let schema = schema.as_object()?;
                let ref_path = schema.get("$ref")?.as_str()?;
                let target_name = Self::ref_name(ref_path)?;

                (Self::is_plain_ref(schema) && target_name != *schema_name)
                    .then_some((schema_name.clone(), target_name))
            })
            .collect();

        if direct_aliases.is_empty() {
            return;
        }

        let resolved_aliases: BTreeMap<String, String> = direct_aliases
            .keys()
            .filter_map(|schema_name| {
                Self::resolve_schema_alias(schema_name, &direct_aliases)
                    .map(|target_name| (schema_name.clone(), target_name))
            })
            .filter(|(schema_name, target_name)| schema_name != target_name)
            .collect();

        if resolved_aliases.is_empty() {
            return;
        }

        Self::replace_component_ref_strings(document, "schemas", &resolved_aliases);

        let Some(schemas) = Self::component_map_mut(document, "schemas") else {
            return;
        };

        schemas.retain(|schema_name, _| !resolved_aliases.contains_key(schema_name));
    }

    pub(super) fn inline_trivial_schema_refs(document: &mut Value) {
        let inlineable_schemas: BTreeMap<String, Value> = Self::schema_lookup(document)
            .into_iter()
            .filter(|(_, schema)| Self::is_inlineable_trivial_schema(schema))
            .collect();

        if inlineable_schemas.is_empty() {
            return;
        }

        Self::replace_trivial_schema_refs(document, &inlineable_schemas);
    }

    fn replace_trivial_schema_refs(
        value: &mut Value,
        inlineable_schemas: &BTreeMap<String, Value>,
    ) {
        match value {
            Value::Array(items) => {
                for item in items {
                    Self::replace_trivial_schema_refs(item, inlineable_schemas);
                }
            }
            Value::Object(object) => {
                if let Some(ref_path) = object.get("$ref").and_then(Value::as_str) {
                    let Some(ref_name) = Self::ref_name(ref_path) else {
                        return;
                    };
                    let Some(schema) = inlineable_schemas.get(&ref_name).cloned() else {
                        return;
                    };

                    let mut siblings = object.clone();
                    siblings.remove("$ref");

                    if let Some(mut merged) =
                        Self::merge_schema_wrapper(siblings, schema, &BTreeMap::new())
                    {
                        Self::replace_trivial_schema_refs(&mut merged, inlineable_schemas);
                        *value = merged;
                    }

                    return;
                }

                for child in object.values_mut() {
                    Self::replace_trivial_schema_refs(child, inlineable_schemas);
                }
            }
            Value::Null | Value::Bool(_) | Value::Number(_) | Value::String(_) => {}
        }
    }

    fn resolve_schema_alias(
        schema_name: &str,
        aliases: &BTreeMap<String, String>,
    ) -> Option<String> {
        let mut current = schema_name.to_string();
        let mut visited = BTreeSet::new();

        while let Some(next) = aliases.get(&current) {
            if !visited.insert(current.clone()) {
                return None;
            }

            current = next.clone();
        }

        Some(current)
    }

    pub(super) fn collapse_duplicate_complex_schemas(document: &mut Value) {
        Self::collapse_schema_duplicates(
            document,
            |_, schema| {
                if !Self::is_complex_schema(schema) {
                    return None;
                }

                serde_json::to_string(schema).ok()
            },
            |_, _, _| None,
        );
    }

    pub(super) fn collapse_documentation_only_schema_duplicates(document: &mut Value) {
        Self::collapse_schema_duplicates(
            document,
            |schema_name, schema| {
                if !Self::is_complex_schema(schema) {
                    return None;
                }

                Some(format!(
                    "{}:{}",
                    Self::operation_payload_schema_family(schema_name)?,
                    Self::schema_shape_key(schema)?,
                ))
            },
            |canonical_name, schema_names, schema_lookup| {
                let mut merged_schema = schema_lookup.get(canonical_name)?.clone();

                for schema_name in schema_names {
                    if let Some(schema) = schema_lookup.get(schema_name) {
                        Self::merge_schema_annotations(&mut merged_schema, schema);
                    }
                }

                Some(merged_schema)
            },
        );
    }

    fn collapse_schema_duplicates<GroupKey, Merge>(
        document: &mut Value,
        mut group_key: GroupKey,
        mut merge_canonical: Merge,
    ) where
        GroupKey: FnMut(&str, &Value) -> Option<String>,
        Merge: FnMut(&str, &[String], &BTreeMap<String, Value>) -> Option<Value>,
    {
        let schema_lookup = Self::schema_lookup(document);
        if schema_lookup.is_empty() {
            return;
        }

        let path_refs = Self::path_schema_refs(document);
        let mut duplicate_groups: BTreeMap<String, Vec<String>> = BTreeMap::new();

        for (schema_name, schema) in &schema_lookup {
            let Some(group) = group_key(schema_name, schema) else {
                continue;
            };
            duplicate_groups
                .entry(group)
                .or_default()
                .push(schema_name.clone());
        }

        let mut dedupe_map = BTreeMap::new();
        let mut merged_canonicals = BTreeMap::new();

        for schema_names in duplicate_groups.into_values() {
            if schema_names.len() < 2 {
                continue;
            }

            let Some(canonical_name) = schema_names
                .iter()
                .min_by_key(|schema_name| Self::schema_name_preference(schema_name, &path_refs))
                .cloned()
            else {
                continue;
            };

            if let Some(merged_schema) =
                merge_canonical(&canonical_name, &schema_names, &schema_lookup)
            {
                merged_canonicals.insert(canonical_name.clone(), merged_schema);
            }

            for schema_name in schema_names {
                if schema_name != canonical_name {
                    dedupe_map.insert(schema_name, canonical_name.clone());
                }
            }
        }

        if dedupe_map.is_empty() {
            return;
        }

        Self::replace_component_ref_strings(document, "schemas", &dedupe_map);

        let Some(schemas) = Self::component_map_mut(document, "schemas") else {
            return;
        };

        for (canonical_name, merged_schema) in merged_canonicals {
            if let Some(schema) = schemas.get_mut(&canonical_name) {
                *schema = merged_schema;
            }
        }

        schemas.retain(|schema_name, _| !dedupe_map.contains_key(schema_name));
    }

    fn hoist_common_path_item_parameters(document: &mut Value) {
        let Some(paths) = document.get_mut("paths").and_then(Value::as_object_mut) else {
            return;
        };

        for path_item in paths.values_mut() {
            Self::hoist_path_item_parameters(path_item);
        }
    }

    pub(super) fn promote_common_parameters(document: &mut Value) {
        let existing_names = Self::component_names(document, "parameters");
        let Some(document_object) = document.as_object_mut() else {
            return;
        };

        let mut parameter_counts: BTreeMap<String, (usize, Value)> = BTreeMap::new();

        {
            let Some(paths) = document_object.get("paths").and_then(Value::as_object) else {
                return;
            };

            for path_item in paths.values() {
                let Some(path_item) = path_item.as_object() else {
                    continue;
                };

                if let Some(parameters) = path_item.get("parameters").and_then(Value::as_array) {
                    for parameter in parameters {
                        let Some(serialized_parameter) = Self::parameter_component_key(parameter)
                        else {
                            continue;
                        };

                        let entry = parameter_counts
                            .entry(serialized_parameter)
                            .or_insert_with(|| (0, parameter.clone()));
                        entry.0 += 1;
                    }
                }

                for (operation_key, operation) in path_item {
                    if !Self::is_http_operation_key(operation_key) {
                        continue;
                    }

                    let Some(parameters) = operation.get("parameters").and_then(Value::as_array)
                    else {
                        continue;
                    };

                    for parameter in parameters {
                        let Some(serialized_parameter) = Self::parameter_component_key(parameter)
                        else {
                            continue;
                        };

                        let entry = parameter_counts
                            .entry(serialized_parameter)
                            .or_insert_with(|| (0, parameter.clone()));
                        entry.0 += 1;
                    }
                }
            }
        }

        let repeated_parameters: Vec<(String, Map<String, Value>)> = parameter_counts
            .into_iter()
            .filter_map(|(serialized, (count, parameter))| {
                (count > 1)
                    .then(|| {
                        parameter
                            .as_object()
                            .cloned()
                            .map(|parameter| (serialized, parameter))
                    })
                    .flatten()
            })
            .collect();

        if repeated_parameters.is_empty() {
            return;
        }

        let mut used_names = existing_names;
        let mut component_parameters = Map::new();
        let mut parameter_ref_map = BTreeMap::new();

        for (serialized_parameter, parameter_object) in repeated_parameters {
            let shared_parameter = Self::shared_parameter_definition(&parameter_object);
            let desired_name = Self::parameter_component_name(&shared_parameter)
                .unwrap_or_else(|| "SharedParameter".to_string());
            let component_name = Self::unique_component_name(&desired_name, &mut used_names);

            component_parameters.insert(component_name.clone(), Value::Object(shared_parameter));
            parameter_ref_map.insert(serialized_parameter, component_name);
        }

        if component_parameters.is_empty() {
            return;
        }

        if let Some(paths) = document_object
            .get_mut("paths")
            .and_then(Value::as_object_mut)
        {
            for path_item in paths.values_mut() {
                Self::replace_parameters_with_refs(path_item, &parameter_ref_map);
            }
        }

        let Some(parameters) = Self::ensure_component_map_mut(document_object, "parameters") else {
            return;
        };

        parameters.extend(component_parameters);
    }

    fn hoist_path_item_parameters(path_item: &mut Value) {
        let Some(path_item) = path_item.as_object_mut() else {
            return;
        };

        let operation_keys = path_item
            .iter()
            .filter(|(key, value)| Self::is_http_operation_key(key) && value.is_object())
            .map(|(key, _)| key.clone())
            .collect::<Vec<_>>();

        if operation_keys.len() < 2 {
            return;
        }

        let existing_path_parameters = path_item
            .get("parameters")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let mut common_parameters = existing_path_parameters
            .iter()
            .filter_map(Self::serialize_parameter)
            .collect::<Vec<_>>();

        if common_parameters.is_empty() {
            common_parameters = operation_keys
                .first()
                .and_then(|operation_key| path_item.get(operation_key))
                .and_then(|operation| operation.get("parameters"))
                .and_then(Value::as_array)
                .map(|parameters| {
                    parameters
                        .iter()
                        .filter_map(Self::serialize_parameter)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
        }

        common_parameters.retain(|parameter| {
            operation_keys.iter().all(|operation_key| {
                path_item
                    .get(operation_key)
                    .and_then(|operation| operation.get("parameters"))
                    .and_then(Value::as_array)
                    .is_some_and(|parameters| {
                        parameters.iter().any(|candidate| {
                            Self::serialize_parameter(candidate)
                                .is_some_and(|candidate| candidate == *parameter)
                        })
                    })
            })
        });

        if common_parameters.is_empty() {
            return;
        }

        let mut path_parameters = existing_path_parameters;
        for serialized_parameter in &common_parameters {
            if !path_parameters.iter().any(|parameter| {
                Self::serialize_parameter(parameter)
                    .is_some_and(|candidate| candidate == *serialized_parameter)
            }) {
                path_parameters.push(
                    serde_json::from_str(serialized_parameter)
                        .expect("Serialized path parameter should deserialize"),
                );
            }
        }

        path_item.insert("parameters".to_string(), Value::Array(path_parameters));

        for operation_key in operation_keys {
            let Some(operation) = path_item.get_mut(&operation_key) else {
                continue;
            };
            let Some(parameters) = operation
                .get_mut("parameters")
                .and_then(Value::as_array_mut)
            else {
                continue;
            };

            parameters.retain(|parameter| {
                Self::serialize_parameter(parameter).is_none_or(|serialized_parameter| {
                    !common_parameters.contains(&serialized_parameter)
                })
            });

            if parameters.is_empty() {
                operation
                    .as_object_mut()
                    .expect("operation should be an object")
                    .remove("parameters");
            }
        }
    }

    fn replace_parameters_with_refs(
        path_item: &mut Value,
        parameter_ref_map: &BTreeMap<String, String>,
    ) {
        let Some(path_item) = path_item.as_object_mut() else {
            return;
        };

        if let Some(parameters) = path_item
            .get_mut("parameters")
            .and_then(Value::as_array_mut)
        {
            Self::replace_parameter_array_with_refs(parameters, parameter_ref_map);
        }

        for (operation_key, operation) in path_item {
            if !Self::is_http_operation_key(operation_key) {
                continue;
            }

            let Some(parameters) = operation
                .get_mut("parameters")
                .and_then(Value::as_array_mut)
            else {
                continue;
            };

            Self::replace_parameter_array_with_refs(parameters, parameter_ref_map);
        }
    }

    fn replace_parameter_array_with_refs(
        parameters: &mut [Value],
        parameter_ref_map: &BTreeMap<String, String>,
    ) {
        for parameter in parameters {
            let Some(serialized_parameter) = Self::parameter_component_key(parameter) else {
                continue;
            };
            let Some(component_name) = parameter_ref_map.get(&serialized_parameter) else {
                continue;
            };

            let mut parameter_ref = Map::new();
            parameter_ref.insert(
                "$ref".to_string(),
                Value::String(Self::parameter_ref(component_name)),
            );
            *parameter = Value::Object(parameter_ref);
        }
    }

    fn remove_empty_info_license(document: &mut Value) {
        let Some(info) = document.get_mut("info").and_then(Value::as_object_mut) else {
            return;
        };

        let should_remove_license =
            info.get("license")
                .and_then(Value::as_object)
                .is_some_and(|license| {
                    license.get("name").and_then(Value::as_str) == Some("")
                        && license.keys().all(|key| key == "name")
                });

        if should_remove_license {
            info.remove("license");
        }
    }

    fn fold_unused_overview_tag_into_info(document: &mut Value) {
        let overview_tag = {
            let Some(document_object) = document.as_object() else {
                return;
            };
            let Some(info) = document_object.get("info").and_then(Value::as_object) else {
                return;
            };
            let Some(title) = info.get("title").and_then(Value::as_str) else {
                return;
            };
            let used_tags = Self::used_operation_tags(document_object.get("paths"));
            let Some(tags) = document_object.get("tags").and_then(Value::as_array) else {
                return;
            };

            tags.iter()
                .filter_map(Value::as_object)
                .find(|tag| {
                    tag.get("name").and_then(Value::as_str) == Some(title)
                        && tag
                            .get("name")
                            .and_then(Value::as_str)
                            .is_some_and(|name| !used_tags.contains(name))
                })
                .cloned()
        };

        let Some(overview_tag) = overview_tag else {
            return;
        };
        let Some(overview_name) = overview_tag.get("name").and_then(Value::as_str) else {
            return;
        };
        let Some(overview_description) = overview_tag.get("description").and_then(Value::as_str)
        else {
            return;
        };

        let Some(document_object) = document.as_object_mut() else {
            return;
        };
        let Some(info) = document_object
            .get_mut("info")
            .and_then(Value::as_object_mut)
        else {
            return;
        };

        let merged_description = match info.get("description").and_then(Value::as_str) {
            Some(existing) if existing.contains(overview_description) => existing.to_string(),
            Some(existing) if existing.trim().is_empty() => overview_description.to_string(),
            Some(existing) => format!("{existing}\n\n{overview_description}"),
            None => overview_description.to_string(),
        };
        info.insert("description".to_string(), Value::String(merged_description));

        let remove_tags = {
            let Some(tags) = document_object
                .get_mut("tags")
                .and_then(Value::as_array_mut)
            else {
                return;
            };
            tags.retain(|tag| tag.get("name").and_then(Value::as_str) != Some(overview_name));
            tags.is_empty()
        };

        if remove_tags {
            document_object.remove("tags");
        }
    }

    fn is_api_error_response(response_object: &Map<String, Value>) -> bool {
        response_object
            .get("content")
            .and_then(Value::as_object)
            .and_then(|content| content.get("application/json"))
            .and_then(Value::as_object)
            .and_then(|content| content.get("schema"))
            .and_then(Value::as_object)
            .and_then(|schema| schema.get("$ref"))
            .and_then(Value::as_str)
            == Some("#/components/schemas/ApiErrorResponse")
    }

    fn error_response_component_name(status_code: &str, description: &str) -> String {
        ERROR_RESPONSE_NAMES
            .iter()
            .find(|(expected_status_code, expected_description, _)| {
                *expected_status_code == status_code && *expected_description == description
            })
            .map(|(_, _, name)| (*name).to_string())
            .unwrap_or_else(|| format!("Http{status_code}{}", Self::pascal_case(description)))
    }

    fn response_ref(name: &str) -> String {
        Self::component_ref("responses", name)
    }

    fn operation_signals_protected_resource(operation: &Map<String, Value>) -> bool {
        let Some(responses) = operation.get("responses").and_then(Value::as_object) else {
            return false;
        };

        responses.iter().any(|(status_code, response)| {
            matches!(status_code.as_str(), "401" | "403")
                && Self::is_auth_error_response(status_code, response)
        })
    }

    fn is_auth_error_response(status_code: &str, response: &Value) -> bool {
        let Some(response_object) = response.as_object() else {
            return false;
        };

        if let Some(ref_path) = response_object.get("$ref").and_then(Value::as_str) {
            return match (status_code, ref_path) {
                ("401", "#/components/responses/UnauthorizedError") => true,
                ("403", "#/components/responses/ForbiddenError") => true,
                _ => false,
            };
        }

        let Some(description) = response_object.get("description").and_then(Value::as_str) else {
            return false;
        };

        match status_code {
            "401" => description == "Unauthorized access",
            "403" => {
                description == "Forbidden — authenticated but not authorised for this resource"
            }
            _ => false,
        }
    }

    fn path_schema_refs(document: &Value) -> BTreeSet<String> {
        let Some(paths) = document.get("paths") else {
            return BTreeSet::new();
        };

        let mut path_document = Map::new();
        path_document.insert("paths".to_string(), paths.clone());
        Self::schema_refs(&Value::Object(path_document))
    }

    fn used_operation_tags(paths: Option<&Value>) -> BTreeSet<String> {
        let mut used_tags = BTreeSet::new();
        let Some(paths) = paths.and_then(Value::as_object) else {
            return used_tags;
        };

        for path_item in paths.values() {
            let Some(path_item) = path_item.as_object() else {
                continue;
            };

            for (key, operation) in path_item {
                if !Self::is_http_operation_key(key) {
                    continue;
                }
                let Some(operation_tags) = operation.get("tags").and_then(Value::as_array) else {
                    continue;
                };

                for tag in operation_tags {
                    if let Some(tag) = tag.as_str() {
                        used_tags.insert(tag.to_string());
                    }
                }
            }
        }

        used_tags
    }

    fn component_lookup(document: &Value, component_kind: &str) -> BTreeMap<String, Value> {
        document
            .get("components")
            .and_then(|components| components.get(component_kind))
            .and_then(Value::as_object)
            .map(|components| {
                components
                    .iter()
                    .map(|(name, component)| (name.clone(), component.clone()))
                    .collect()
            })
            .unwrap_or_default()
    }

    fn component_names(document: &Value, component_kind: &str) -> BTreeSet<String> {
        Self::component_lookup(document, component_kind)
            .into_keys()
            .collect()
    }

    fn component_map_mut<'a>(
        document: &'a mut Value,
        component_kind: &str,
    ) -> Option<&'a mut Map<String, Value>> {
        document
            .get_mut("components")
            .and_then(Value::as_object_mut)
            .and_then(|components| components.get_mut(component_kind))
            .and_then(Value::as_object_mut)
    }

    fn ensure_component_map_mut<'a>(
        document: &'a mut Map<String, Value>,
        component_kind: &str,
    ) -> Option<&'a mut Map<String, Value>> {
        let components = document
            .entry("components".to_string())
            .or_insert_with(|| Value::Object(Map::new()))
            .as_object_mut()?;
        components
            .entry(component_kind.to_string())
            .or_insert_with(|| Value::Object(Map::new()))
            .as_object_mut()
    }

    fn component_ref(component_kind: &str, name: &str) -> String {
        format!("#/components/{component_kind}/{name}")
    }

    fn component_ref_name(ref_path: &str, component_kind: &str) -> Option<String> {
        ref_path
            .strip_prefix(&format!("#/components/{component_kind}/"))
            .map(ToOwned::to_owned)
    }

    fn parameter_component_key(parameter: &Value) -> Option<String> {
        let object = parameter.as_object()?;
        if object.contains_key("$ref") {
            return None;
        }

        serde_json::to_string(&Value::Object(Self::object_without_fields(
            object,
            PARAMETER_ANNOTATION_FIELDS,
        )))
        .ok()
    }

    fn shared_parameter_definition(parameter: &Map<String, Value>) -> Map<String, Value> {
        Self::object_without_fields(parameter, PARAMETER_ANNOTATION_FIELDS)
    }

    fn serialize_parameter(parameter: &Value) -> Option<String> {
        serde_json::to_string(parameter).ok()
    }

    fn object_without_fields(object: &Map<String, Value>, fields: &[&str]) -> Map<String, Value> {
        let mut value = object.clone();
        for field in fields {
            value.remove(*field);
        }
        value
    }

    fn operation_payload_schema_family(schema_name: &str) -> Option<String> {
        let mut family = schema_name;
        let mut changed = false;

        for prefix in PAYLOAD_SCHEMA_PREFIXES {
            if let Some(stripped) = family.strip_prefix(prefix) {
                family = stripped;
                changed = true;
                break;
            }
        }

        for suffix in PAYLOAD_SCHEMA_SUFFIXES {
            if let Some(stripped) = family.strip_suffix(suffix) {
                family = stripped;
                changed = true;
            }
        }

        (changed && !family.is_empty()).then(|| family.to_string())
    }

    fn parameter_component_name(parameter: &Map<String, Value>) -> Option<String> {
        let location = parameter.get("in")?.as_str()?;
        let name = parameter.get("name")?.as_str()?;
        let qualifier = if parameter
            .get("schema")
            .is_some_and(Self::schema_value_allows_null)
        {
            "Nullable"
        } else {
            ""
        };

        Some(format!(
            "{}{}{}",
            Self::pascal_case(location),
            qualifier,
            Self::pascal_case(name)
        ))
    }

    fn parameter_ref(name: &str) -> String {
        Self::component_ref("parameters", name)
    }

    pub(super) fn remove_unused_component_schemas(document: &mut Value) {
        let schema_lookup = Self::schema_lookup(document);
        let mut reachable = Self::root_schema_refs(document);
        let mut pending: Vec<String> = reachable.iter().cloned().collect();

        while let Some(schema_name) = pending.pop() {
            let Some(schema) = schema_lookup.get(&schema_name) else {
                continue;
            };

            for nested_ref in Self::schema_refs(schema) {
                if reachable.insert(nested_ref.clone()) {
                    pending.push(nested_ref);
                }
            }
        }

        let Some(schemas) = document
            .get_mut("components")
            .and_then(Value::as_object_mut)
            .and_then(|components| components.get_mut("schemas"))
            .and_then(Value::as_object_mut)
        else {
            return;
        };

        schemas.retain(|schema_name, _| reachable.contains(schema_name));
    }

    fn root_schema_refs(document: &Value) -> BTreeSet<String> {
        let mut root_document = document.clone();

        if let Some(components) = root_document
            .get_mut("components")
            .and_then(Value::as_object_mut)
        {
            if let Some(schemas) = components.get_mut("schemas") {
                *schemas = Value::Object(Map::new());
            }
        }

        Self::schema_refs(&root_document)
    }

    fn schema_refs(value: &Value) -> BTreeSet<String> {
        let mut refs = BTreeSet::new();
        Self::collect_schema_refs(value, &mut refs);
        refs
    }

    fn collect_schema_refs(value: &Value, refs: &mut BTreeSet<String>) {
        match value {
            Value::Array(items) => {
                for item in items {
                    Self::collect_schema_refs(item, refs);
                }
            }
            Value::Object(object) => {
                if let Some(ref_path) = object.get("$ref").and_then(Value::as_str) {
                    if let Some(ref_name) = Self::ref_name(ref_path) {
                        refs.insert(ref_name);
                    }
                }

                for child in object.values() {
                    Self::collect_schema_refs(child, refs);
                }
            }
            Value::Null | Value::Bool(_) | Value::Number(_) | Value::String(_) => {}
        }
    }

    fn schema_lookup(document: &Value) -> BTreeMap<String, Value> {
        Self::component_lookup(document, "schemas")
    }

    fn schema_shape_key(schema: &Value) -> Option<String> {
        serde_json::to_string(&Self::strip_schema_annotations(schema)).ok()
    }

    fn strip_schema_annotations(value: &Value) -> Value {
        match value {
            Value::Array(items) => {
                Value::Array(items.iter().map(Self::strip_schema_annotations).collect())
            }
            Value::Object(object) => Value::Object(
                object
                    .iter()
                    .filter(|(key, _)| !Self::is_schema_annotation_field(key))
                    .map(|(key, value)| (key.clone(), Self::strip_schema_annotations(value)))
                    .collect(),
            ),
            Value::Null | Value::Bool(_) | Value::Number(_) | Value::String(_) => value.clone(),
        }
    }

    fn merge_schema_annotations(target: &mut Value, source: &Value) {
        match (target, source) {
            (Value::Object(target_object), Value::Object(source_object)) => {
                for (key, source_value) in source_object {
                    match target_object.get_mut(key) {
                        Some(target_value) if Self::is_schema_annotation_field(key) => {
                            Self::merge_schema_annotation_value(target_value, source_value);
                        }
                        Some(target_value) => {
                            Self::merge_schema_annotations(target_value, source_value);
                        }
                        None if Self::is_schema_annotation_field(key) => {
                            target_object.insert(key.clone(), source_value.clone());
                        }
                        None => {}
                    }
                }
            }
            (Value::Array(target_items), Value::Array(source_items))
                if target_items.len() == source_items.len() =>
            {
                for (target_item, source_item) in target_items.iter_mut().zip(source_items.iter()) {
                    Self::merge_schema_annotations(target_item, source_item);
                }
            }
            _ => {}
        }
    }

    fn merge_schema_annotation_value(target: &mut Value, source: &Value) {
        match source {
            Value::String(source_string) => {
                if let Value::String(target_string) = target {
                    if source_string.len() > target_string.len() {
                        *target_string = source_string.clone();
                    }
                } else if target.is_null() {
                    *target = source.clone();
                }
            }
            Value::Array(source_items) => {
                if let Value::Array(target_items) = target {
                    if target_items.is_empty() {
                        *target_items = source_items.clone();
                    }
                } else if target.is_null() {
                    *target = source.clone();
                }
            }
            Value::Object(source_object) => {
                if let Value::Object(target_object) = target {
                    if target_object.is_empty() {
                        *target_object = source_object.clone();
                    }
                } else if target.is_null() {
                    *target = source.clone();
                }
            }
            _ => {}
        }
    }

    fn is_schema_annotation_field(key: &str) -> bool {
        matches!(key, "title" | "description" | "example" | "examples")
    }

    fn is_inlineable_trivial_schema(schema: &Value) -> bool {
        let Some(schema) = schema.as_object() else {
            return false;
        };

        if schema.contains_key("$ref")
            || schema.contains_key("enum")
            || schema.contains_key("properties")
            || schema.contains_key("items")
            || schema.contains_key("additionalProperties")
            || schema.contains_key("allOf")
            || schema.contains_key("anyOf")
            || schema.contains_key("oneOf")
            || schema.contains_key("not")
            || schema.contains_key("discriminator")
        {
            return false;
        }

        let Some(schema_type) = schema.get("type") else {
            return false;
        };
        let Some(schema_types) = Self::type_set(schema_type) else {
            return false;
        };

        if schema_types.is_empty()
            || schema_types
                .iter()
                .any(|schema_type| !INLINEABLE_SCHEMA_TYPES.contains(&schema_type.as_str()))
        {
            return false;
        }

        schema
            .keys()
            .all(|key| INLINEABLE_SCHEMA_FIELDS.contains(&key.as_str()))
    }

    fn is_complex_schema(schema: &Value) -> bool {
        let Some(schema) = schema.as_object() else {
            return false;
        };

        schema.contains_key("properties")
            || schema.contains_key("items")
            || schema.contains_key("additionalProperties")
            || schema.contains_key("allOf")
            || schema.contains_key("anyOf")
            || schema.contains_key("oneOf")
            || schema
                .get("type")
                .and_then(Value::as_str)
                .is_some_and(|schema_type| matches!(schema_type, "object" | "array"))
    }

    fn schema_name_preference(
        schema_name: &str,
        path_refs: &BTreeSet<String>,
    ) -> (usize, usize, usize, String) {
        let penalty = SCHEMA_NAME_PENALTY_TOKENS
            .iter()
            .filter(|token| schema_name.contains(*token))
            .count();

        (
            penalty,
            schema_name.len(),
            usize::from(!path_refs.contains(schema_name)),
            schema_name.to_string(),
        )
    }

    fn merge_unique_values(existing: Vec<Value>, new_items: Vec<Value>) -> Vec<Value> {
        let mut merged = existing;

        for item in new_items {
            if !merged.iter().any(|existing_item| existing_item == &item) {
                merged.push(item);
            }
        }

        merged
    }

    fn is_plain_ref(object: &Map<String, Value>) -> bool {
        object.len() == 1 && object.contains_key("$ref")
    }

    fn is_null_schema(schema: &Value) -> bool {
        schema
            .as_object()
            .and_then(|object| object.get("type"))
            .and_then(Value::as_str)
            == Some("null")
    }

    fn ref_name(ref_path: &str) -> Option<String> {
        Self::component_ref_name(ref_path, "schemas")
    }

    fn schema_ref(name: &str) -> String {
        Self::component_ref("schemas", name)
    }

    fn is_generator_friendly_operation_id(operation_id: &str) -> bool {
        let mut characters = operation_id.chars();
        match characters.next() {
            Some(first) if first.is_ascii_alphabetic() || first == '_' => {}
            _ => return false,
        }

        characters.all(|character| character.is_ascii_alphanumeric() || character == '_')
    }

    fn operation_id_from_path(method: &str, path: &str) -> String {
        let path_identifier = Self::snake_case_identifier(path);
        if path_identifier.is_empty() {
            method.to_string()
        } else {
            format!("{method}_{path_identifier}")
        }
    }

    fn snake_case_identifier(value: &str) -> String {
        let mut result = String::new();
        let mut previous_was_separator = true;
        let mut previous_was_lower_or_digit = false;

        for character in value.chars() {
            if !character.is_ascii_alphanumeric() {
                if !previous_was_separator && !result.is_empty() {
                    result.push('_');
                }
                previous_was_separator = true;
                previous_was_lower_or_digit = false;
                continue;
            }

            if character.is_ascii_uppercase() && previous_was_lower_or_digit && !result.is_empty() {
                result.push('_');
            }

            result.push(character.to_ascii_lowercase());
            previous_was_separator = false;
            previous_was_lower_or_digit =
                character.is_ascii_lowercase() || character.is_ascii_digit();
        }

        let result = result.trim_matches('_').to_string();

        match result.chars().next() {
            Some(first) if first.is_ascii_digit() => format!("operation_{result}"),
            _ => result,
        }
    }

    fn pascal_case(value: &str) -> String {
        value
            .split(|character: char| !character.is_ascii_alphanumeric())
            .filter(|segment| !segment.is_empty())
            .map(|segment| {
                let mut characters = segment.chars();
                match characters.next() {
                    Some(first) => {
                        let mut formatted = String::new();
                        formatted.push(first.to_ascii_uppercase());
                        formatted.push_str(characters.as_str());
                        formatted
                    }
                    None => String::new(),
                }
            })
            .collect()
    }

    fn is_http_operation_key(key: &str) -> bool {
        HTTP_OPERATION_KEYS.contains(&key)
    }

    fn value_matches_type(schema_type: &str, value: &Value) -> bool {
        match schema_type {
            "null" => value.is_null(),
            "boolean" => value.is_boolean(),
            "string" => value.is_string(),
            "integer" => value
                .as_i64()
                .or_else(|| value.as_u64().and_then(|value| i64::try_from(value).ok()))
                .is_some(),
            "number" => value.is_number(),
            "object" => value.is_object(),
            "array" => value.is_array(),
            _ => true,
        }
    }
}
