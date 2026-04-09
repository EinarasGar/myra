use rust_decimal::Decimal;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

/// Ownership share. Must be > 0 and <= 1.
#[derive(Clone, Debug, utoipa::ToSchema)]
#[schema(value_type = f64)]
pub struct OwnershipShare(Decimal);

impl<'de> Deserialize<'de> for OwnershipShare {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = rust_decimal::serde::arbitrary_precision::deserialize(deserializer)?;
        if value <= Decimal::ZERO || value > Decimal::ONE {
            return Err(serde::de::Error::custom(
                "Must be between 0 (exclusive) and 1 (inclusive).",
            ));
        }
        Ok(OwnershipShare(value))
    }
}

impl Serialize for OwnershipShare {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        rust_decimal::serde::arbitrary_precision::serialize(&self.0, serializer)
    }
}

impl OwnershipShare {
    pub fn as_decimal(&self) -> Decimal {
        self.0
    }

    /// Construct from a trusted source (e.g. database) without validation.
    /// Must NOT be used for untrusted user input — use deserialization instead.
    pub fn from_trusted(d: Decimal) -> Self {
        OwnershipShare(d)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn ownership_share_valid() {
        let result: Result<OwnershipShare, _> = serde_json::from_str("0.5");
        assert!(result.is_ok());
        assert_eq!(result.unwrap().as_decimal(), dec!(0.5));
    }

    #[test]
    fn ownership_share_zero_rejected() {
        let result: Result<OwnershipShare, _> = serde_json::from_str("0");
        assert!(result.is_err());
    }

    #[test]
    fn ownership_share_negative_rejected() {
        let result: Result<OwnershipShare, _> = serde_json::from_str("-0.5");
        assert!(result.is_err());
    }

    #[test]
    fn ownership_share_above_one_rejected() {
        let result: Result<OwnershipShare, _> = serde_json::from_str("1.5");
        assert!(result.is_err());
    }

    #[test]
    fn ownership_share_exactly_one_accepted() {
        let result: Result<OwnershipShare, _> = serde_json::from_str("1");
        assert!(result.is_ok());
        assert_eq!(result.unwrap().as_decimal(), dec!(1));
    }

    #[test]
    fn ownership_share_from_trusted_no_validation() {
        let share = OwnershipShare::from_trusted(dec!(1.5));
        assert_eq!(share.as_decimal(), dec!(1.5));
    }
}
