use serde::{Deserialize, Deserializer};

/// User password. Must be between 8 and 200 characters. Whitespace is preserved.
///
/// **Deserialize-only** — this type intentionally does not implement `Serialize`
/// to prevent raw passwords from being accidentally exposed in API responses or logs.
#[derive(Clone, Debug, utoipa::ToSchema)]
#[schema(value_type = String)]
pub struct Password(String);

impl<'de> Deserialize<'de> for Password {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let len = s.chars().count();
        if len < 8 || len > 200 {
            return Err(serde::de::Error::custom(
                "Must be between 8 and 200 characters.",
            ));
        }
        Ok(Password(s))
    }
}

impl Password {
    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_inner(self) -> String {
        self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn password_valid() {
        let result: Result<Password, _> = serde_json::from_str(r#""password""#);
        assert!(result.is_ok());
    }

    #[test]
    fn password_too_short_rejected() {
        let result: Result<Password, _> = serde_json::from_str(r#""pass""#);
        assert!(result.is_err());
    }

    #[test]
    fn password_empty_rejected() {
        let result: Result<Password, _> = serde_json::from_str(r#""""#);
        assert!(result.is_err());
    }

    #[test]
    fn password_spaces_preserved() {
        let result: Result<Password, _> = serde_json::from_str(r#""  hello   ""#);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().as_str(), "  hello   ");
    }
}
