use serde::{Deserialize, Deserializer, Serialize, Serializer};
use utoipa::ToSchema;

validated_string_type!(Description, max_len = 500, description = "Description");
