/// Generates a validated string newtype that trims whitespace on deserialisation
/// and rejects empty or over-length values.
macro_rules! validated_string_type {
    ($name:ident, max_len = $max:expr, description = $desc:expr) => {
        #[doc = $desc]
        #[derive(Clone, Debug, ToSchema)]
        #[schema(value_type = String)]
        pub struct $name(String);

        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
            where
                D: Deserializer<'de>,
            {
                let s = String::deserialize(deserializer)?;
                let trimmed = s.trim().to_owned();
                if trimmed.is_empty() || trimmed.len() > $max {
                    return Err(serde::de::Error::custom(format!(
                        "Must be between 1 and {} characters.",
                        $max
                    )));
                }
                Ok($name(trimmed))
            }
        }

        impl Serialize for $name {
            fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
            where
                S: Serializer,
            {
                self.0.serialize(serializer)
            }
        }

        impl $name {
            pub fn as_str(&self) -> &str {
                &self.0
            }

            #[allow(dead_code)]
            pub fn into_inner(self) -> String {
                self.0
            }

            /// Construct from a trusted source (e.g. database) without validation.
            /// Must NOT be used for untrusted user input — use deserialization instead.
            pub fn from_trusted(s: String) -> Self {
                $name(s)
            }
        }
    };
}
