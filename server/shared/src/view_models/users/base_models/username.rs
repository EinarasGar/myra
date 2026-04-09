use serde::{Deserialize, Deserializer, Serialize, Serializer};

validated_string_type!(Username, max_len = 100, description = "Username");
