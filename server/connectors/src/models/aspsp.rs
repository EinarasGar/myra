/// A bank (Account Servicing Payment Service Provider) discoverable through a provider.
#[derive(Debug, Clone, PartialEq)]
pub struct Aspsp {
    pub name: String,
    pub country: String,
}
