use rust_decimal::Decimal;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

pub trait IntoDecimal {
    fn into_decimal(self) -> Decimal;
    fn as_decimal(&self) -> Decimal;
}

#[derive(Clone, Debug, utoipa::ToSchema)]
#[schema(value_type = f64)]
pub struct Amount(pub Decimal);

impl IntoDecimal for Amount {
    fn into_decimal(self) -> Decimal {
        self.0
    }
    fn as_decimal(&self) -> Decimal {
        self.0
    }
}

impl Serialize for Amount {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        rust_decimal::serde::arbitrary_precision::serialize(&self.0, serializer)
    }
}

impl<'de> Deserialize<'de> for Amount {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = rust_decimal::serde::arbitrary_precision::deserialize(deserializer)?;
        Ok(Amount(value))
    }
}

#[allow(dead_code)]
#[derive(Clone, Debug, utoipa::ToSchema)]
#[schema(value_type = f64)]
pub struct PositiveAmount(pub Decimal);

impl IntoDecimal for PositiveAmount {
    fn into_decimal(self) -> Decimal {
        self.0
    }
    fn as_decimal(&self) -> Decimal {
        self.0
    }
}

impl Serialize for PositiveAmount {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        rust_decimal::serde::arbitrary_precision::serialize(&self.0, serializer)
    }
}

impl<'de> Deserialize<'de> for PositiveAmount {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = rust_decimal::serde::arbitrary_precision::deserialize(deserializer)?;
        if value <= Decimal::ZERO {
            return Err(serde::de::Error::custom("Must be a positive value."));
        }
        Ok(PositiveAmount(value))
    }
}

#[allow(dead_code)]
#[derive(Clone, Debug, utoipa::ToSchema)]
#[schema(value_type = f64)]
pub struct NegativeAmount(pub Decimal);

impl IntoDecimal for NegativeAmount {
    fn into_decimal(self) -> Decimal {
        self.0
    }
    fn as_decimal(&self) -> Decimal {
        self.0
    }
}

impl Serialize for NegativeAmount {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        rust_decimal::serde::arbitrary_precision::serialize(&self.0, serializer)
    }
}

impl<'de> Deserialize<'de> for NegativeAmount {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = rust_decimal::serde::arbitrary_precision::deserialize(deserializer)?;
        if value >= Decimal::ZERO {
            return Err(serde::de::Error::custom("Must be a negative value."));
        }
        Ok(NegativeAmount(value))
    }
}

#[allow(dead_code)]
#[derive(Clone, Debug, utoipa::ToSchema)]
#[schema(value_type = f64)]
pub struct NonZeroAmount(pub Decimal);

impl IntoDecimal for NonZeroAmount {
    fn into_decimal(self) -> Decimal {
        self.0
    }
    fn as_decimal(&self) -> Decimal {
        self.0
    }
}

impl Serialize for NonZeroAmount {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        rust_decimal::serde::arbitrary_precision::serialize(&self.0, serializer)
    }
}

impl<'de> Deserialize<'de> for NonZeroAmount {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = rust_decimal::serde::arbitrary_precision::deserialize(deserializer)?;
        if value == Decimal::ZERO {
            return Err(serde::de::Error::custom("Must not be zero."));
        }
        Ok(NonZeroAmount(value))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_positive_amount_rejects_zero() {
        let json = "0";
        let result: Result<PositiveAmount, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_positive_amount_rejects_negative() {
        let json = "-5.5";
        let result: Result<PositiveAmount, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_positive_amount_accepts_positive() {
        let json = "10.25";
        let result: Result<PositiveAmount, _> = serde_json::from_str(json);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().0, dec!(10.25));
    }

    #[test]
    fn test_negative_amount_rejects_zero() {
        let json = "0";
        let result: Result<NegativeAmount, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_negative_amount_rejects_positive() {
        let json = "5.5";
        let result: Result<NegativeAmount, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_negative_amount_accepts_negative() {
        let json = "-10.25";
        let result: Result<NegativeAmount, _> = serde_json::from_str(json);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().0, dec!(-10.25));
    }

    #[test]
    fn test_non_zero_amount_rejects_zero() {
        let json = "0";
        let result: Result<NonZeroAmount, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_non_zero_amount_accepts_positive() {
        let result: Result<NonZeroAmount, _> = serde_json::from_str("1.5");
        assert!(result.is_ok());
    }

    #[test]
    fn test_non_zero_amount_accepts_negative() {
        let result: Result<NonZeroAmount, _> = serde_json::from_str("-1.5");
        assert!(result.is_ok());
    }

    #[test]
    fn test_amount_roundtrips_precision() {
        let json = "123456789.123456789";
        let amount: Amount = serde_json::from_str(json).unwrap();
        assert_eq!(amount.0, dec!(123456789.123456789));
        let serialized = serde_json::to_string(&amount).unwrap();
        assert_eq!(serialized, "123456789.123456789");
    }
}
