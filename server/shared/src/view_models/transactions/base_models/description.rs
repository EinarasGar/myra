use serde::{Deserialize, Deserializer, Serialize, Serializer};

validated_string_type!(Description, max_len = 500, description = "Description");
