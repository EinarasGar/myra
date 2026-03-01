use serde::{Deserialize, Deserializer, Serialize, Serializer};
use utoipa::ToSchema;

validated_string_type!(AssetName, max_len = 200, description = "Asset name");
