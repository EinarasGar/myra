use serde::{Deserialize, Deserializer, Serialize, Serializer};
use utoipa::ToSchema;

validated_string_type!(IconName, max_len = 50, description = "Icon name");
