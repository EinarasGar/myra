use serde::{Deserialize, Deserializer, Serialize, Serializer};
use utoipa::ToSchema;

validated_string_type!(Username, max_len = 100, description = "Username");
