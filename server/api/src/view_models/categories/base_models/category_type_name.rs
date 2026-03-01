use serde::{Deserialize, Deserializer, Serialize, Serializer};
use utoipa::ToSchema;

validated_string_type!(CategoryTypeName, max_len = 50, description = "Category type name");
