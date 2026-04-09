use serde::{Deserialize, Deserializer, Serialize, Serializer};

validated_string_type!(CategoryName, max_len = 100, description = "Category name");
