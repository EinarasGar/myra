use serde::{Deserialize, Deserializer, Serialize, Serializer};
use utoipa::ToSchema;

validated_string_type!(ExchangeName, max_len = 100, description = "Exchange name");
