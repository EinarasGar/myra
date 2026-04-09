use rust_decimal::Decimal;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

/// Positive rate (e.g. exchange rate). Must be strictly greater than zero.
#[derive(Clone, Debug, utoipa::ToSchema)]
#[schema(value_type = f64)]
pub struct PositiveRate(Decimal);

impl<'de> Deserialize<'de> for PositiveRate {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = rust_decimal::serde::arbitrary_precision::deserialize(deserializer)?;
        if value <= Decimal::ZERO {
            return Err(serde::de::Error::custom("Must be a positive value."));
        }
        Ok(PositiveRate(value))
    }
}

impl Serialize for PositiveRate {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        rust_decimal::serde::arbitrary_precision::serialize(&self.0, serializer)
    }
}

impl PositiveRate {
    pub fn as_decimal(&self) -> Decimal {
        self.0
    }

    pub fn to_f64(&self) -> f64 {
        use rust_decimal::prelude::ToPrimitive;
        self.0.to_f64().unwrap_or(0.0)
    }

    /// Construct from a trusted source (e.g. database) without validation.
    /// Must NOT be used for untrusted user input — use deserialization instead.
    pub fn from_trusted(d: Decimal) -> Self {
        PositiveRate(d)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn positive_rate_valid() {
        let result: Result<PositiveRate, _> = serde_json::from_str("0.05");
        assert!(result.is_ok());
        assert_eq!(result.unwrap().as_decimal(), dec!(0.05));
    }

    #[test]
    fn positive_rate_zero_rejected() {
        let result: Result<PositiveRate, _> = serde_json::from_str("0");
        assert!(result.is_err());
    }

    #[test]
    fn positive_rate_negative_rejected() {
        let result: Result<PositiveRate, _> = serde_json::from_str("-0.05");
        assert!(result.is_err());
    }
}
