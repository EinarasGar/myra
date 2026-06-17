#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AccountIdentifierKind {
    CardLast4,
    AccountNumber,
    Iban,
}

impl AccountIdentifierKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::CardLast4 => "card_last4",
            Self::AccountNumber => "account_number",
            Self::Iban => "iban",
        }
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s {
            "card_last4" => Some(Self::CardLast4),
            "account_number" => Some(Self::AccountNumber),
            "iban" => Some(Self::Iban),
            _ => None,
        }
    }
}

pub struct AccountIdentifierDto {
    pub kind: AccountIdentifierKind,
    pub value: String,
}
