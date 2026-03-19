use serde::{Deserialize, Deserializer, Serialize, Serializer};
use utoipa::ToSchema;

const MAX_FILE_SIZE: i64 = 20_971_520;

/// File size in bytes. Must be between 1 and 20 MB (20,971,520 bytes).
#[derive(Clone, Debug, ToSchema)]
#[schema(value_type = i64)]
pub struct FileSizeBytes(i64);

impl<'de> Deserialize<'de> for FileSizeBytes {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = i64::deserialize(deserializer)?;
        if value <= 0 {
            return Err(serde::de::Error::custom(
                "File size must be a positive number.",
            ));
        }
        if value > MAX_FILE_SIZE {
            return Err(serde::de::Error::custom(format!(
                "File size must not exceed {} bytes (20 MB).",
                MAX_FILE_SIZE
            )));
        }
        Ok(FileSizeBytes(value))
    }
}

impl Serialize for FileSizeBytes {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.0.serialize(serializer)
    }
}

impl FileSizeBytes {
    pub fn value(&self) -> i64 {
        self.0
    }
}
