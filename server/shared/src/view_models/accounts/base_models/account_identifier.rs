use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum AccountIdentifierKind {
    CardLast4,
    AccountNumber,
    Iban,
}

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AccountIdentifierViewModel {
    pub kind: AccountIdentifierKind,
    pub value: String,
}

impl AccountIdentifierKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::CardLast4 => "card_last4",
            Self::AccountNumber => "account_number",
            Self::Iban => "iban",
        }
    }

    pub fn normalize(&self, raw: &str) -> String {
        match self {
            Self::CardLast4 => raw.trim().to_string(),
            Self::AccountNumber => raw.chars().filter(char::is_ascii_digit).collect(),
            Self::Iban => raw
                .chars()
                .filter(|c| !c.is_whitespace())
                .collect::<String>()
                .to_uppercase(),
        }
    }

    pub fn validate(&self, value: &str) -> Result<(), String> {
        match self {
            Self::CardLast4 => {
                if value.len() == 4 && value.bytes().all(|b| b.is_ascii_digit()) {
                    Ok(())
                } else {
                    Err("Card last 4 must be exactly 4 digits.".to_string())
                }
            }
            Self::AccountNumber => {
                if (4..=34).contains(&value.len()) && value.bytes().all(|b| b.is_ascii_digit()) {
                    Ok(())
                } else {
                    Err("Account number must be 4–34 digits.".to_string())
                }
            }
            Self::Iban => {
                let b = value.as_bytes();
                let ok = (15..=34).contains(&value.len())
                    && b[0].is_ascii_uppercase()
                    && b[1].is_ascii_uppercase()
                    && b[2].is_ascii_digit()
                    && b[3].is_ascii_digit()
                    && value
                        .bytes()
                        .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit());
                if ok {
                    Ok(())
                } else {
                    Err(
                        "IBAN must be 15–34 chars: 2 letters, 2 digits, then letters/digits."
                            .to_string(),
                    )
                }
            }
        }
    }
}

#[cfg(feature = "backend")]
use business::dtos::accounts::account_identifier_dto::AccountIdentifierKind as BusinessKind;

#[cfg(feature = "backend")]
impl AccountIdentifierKind {
    pub fn to_business(self) -> BusinessKind {
        match self {
            Self::CardLast4 => BusinessKind::CardLast4,
            Self::AccountNumber => BusinessKind::AccountNumber,
            Self::Iban => BusinessKind::Iban,
        }
    }
}

#[cfg(feature = "backend")]
impl From<BusinessKind> for AccountIdentifierKind {
    fn from(b: BusinessKind) -> Self {
        match b {
            BusinessKind::CardLast4 => Self::CardLast4,
            BusinessKind::AccountNumber => Self::AccountNumber,
            BusinessKind::Iban => Self::Iban,
        }
    }
}

#[cfg(feature = "backend")]
pub(crate) fn validate_identifiers(
    items: &[AccountIdentifierViewModel],
) -> Result<(), Vec<crate::errors::FieldError>> {
    let mut errors = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for (i, item) in items.iter().enumerate() {
        let value = item.kind.normalize(&item.value);
        if let Err(message) = item.kind.validate(&value) {
            errors.push(crate::errors::FieldError {
                field: format!("identifiers[{i}].value"),
                message,
            });
            continue;
        }
        if !seen.insert((item.kind, value)) {
            errors.push(crate::errors::FieldError {
                field: format!("identifiers[{i}]"),
                message: "Duplicate identifier.".to_string(),
            });
        }
    }
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

#[cfg(feature = "backend")]
pub(crate) fn identifiers_to_dtos(
    items: &[AccountIdentifierViewModel],
) -> Vec<business::dtos::accounts::account_identifier_dto::AccountIdentifierDto> {
    use business::dtos::accounts::account_identifier_dto::AccountIdentifierDto;

    items
        .iter()
        .map(|item| AccountIdentifierDto {
            kind: item.kind.to_business(),
            value: item.kind.normalize(&item.value),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::AccountIdentifierKind::*;

    #[test]
    fn card_last4_preserves_leading_zeros() {
        assert_eq!(CardLast4.normalize("0042"), "0042");
        assert!(CardLast4.validate("0042").is_ok());
    }

    #[test]
    fn card_last4_rejects_non_4_digit() {
        assert!(CardLast4.validate("123").is_err());
        assert!(CardLast4.validate("12a4").is_err());
    }

    #[test]
    fn account_number_strips_separators() {
        let n = AccountNumber.normalize("1234-5678 90");
        assert_eq!(n, "1234567890");
        assert!(AccountNumber.validate(&n).is_ok());
    }

    #[test]
    fn account_number_rejects_too_short() {
        assert!(AccountNumber.validate("12").is_err());
    }

    #[test]
    fn iban_uppercases_and_strips_spaces() {
        let n = Iban.normalize("gb29 nwbk 6016 1331 9268 19");
        assert_eq!(n, "GB29NWBK60161331926819");
        assert!(Iban.validate(&n).is_ok());
    }

    #[test]
    fn iban_rejects_bad_shape() {
        assert!(Iban.validate("1234").is_err());
        assert!(Iban.validate("GBXX12345678901234").is_err());
    }

    #[test]
    fn wire_strings() {
        assert_eq!(CardLast4.as_str(), "card_last4");
        assert_eq!(AccountNumber.as_str(), "account_number");
        assert_eq!(Iban.as_str(), "iban");
    }
}
