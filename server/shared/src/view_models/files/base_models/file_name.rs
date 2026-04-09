use serde::{Deserialize, Deserializer, Serialize, Serializer};

/// Original file name. Must be 1-255 characters and must not contain path separators.
#[derive(Clone, Debug, utoipa::ToSchema)]
#[schema(value_type = String)]
pub struct FileName(String);

impl<'de> Deserialize<'de> for FileName {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let trimmed = s.trim().to_owned();
        if trimmed.is_empty() || trimmed.len() > 255 {
            return Err(serde::de::Error::custom(
                "File name must be between 1 and 255 characters.",
            ));
        }
        if trimmed.contains('/') || trimmed.contains('\\') {
            return Err(serde::de::Error::custom(
                "File name must not contain path separators (/ or \\).",
            ));
        }
        Ok(FileName(trimmed))
    }
}

impl Serialize for FileName {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.0.serialize(serializer)
    }
}

impl FileName {
    pub fn into_inner(self) -> String {
        self.0
    }
}
