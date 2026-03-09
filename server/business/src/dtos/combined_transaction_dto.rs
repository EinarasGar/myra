use super::{transaction_dto::TransactionDto, transaction_group_dto::TransactionGroupDto};

pub enum CombinedTransactionItem {
    Individual(TransactionDto),
    Group(TransactionGroupDto),
}
