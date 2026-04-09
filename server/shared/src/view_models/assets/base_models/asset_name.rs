use serde::{Deserialize, Deserializer, Serialize, Serializer};

validated_string_type!(AssetName, max_len = 200, description = "Asset name");
