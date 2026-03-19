use serde::{Deserialize, Deserializer, Serialize, Serializer};
use utoipa::ToSchema;

/// MIME type. Must be non-empty, contain exactly one '/', and not include parameters.
#[derive(Clone, Debug, ToSchema)]
#[schema(value_type = String)]
pub struct MimeType(String);

impl<'de> Deserialize<'de> for MimeType {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let trimmed = s.trim().to_owned();
        if trimmed.is_empty() || trimmed.matches('/').count() != 1 || trimmed.contains(';') {
            return Err(serde::de::Error::custom(
                "MIME type must be non-empty, contain exactly one '/', and not include parameters (e.g. 'image/png').",
            ));
        }
        Ok(MimeType(trimmed))
    }
}

impl Serialize for MimeType {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.0.serialize(serializer)
    }
}

impl MimeType {
    pub fn into_inner(self) -> String {
        self.0
    }
}
