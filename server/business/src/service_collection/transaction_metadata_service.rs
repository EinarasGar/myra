#[mockall_double::double]
use dal::database_context::MyraDb;

use dal::{
    models::{
        transaction_models::AddTransactionDescriptionModel,
        transcation_description::TransactionDescriptionModel,
    },
    queries::transaction_data_queries,
};
use uuid::Uuid;

use crate::entities::transactions::{metadata::MetadataField, transaction::Transaction};

pub struct TransactionMetadataService {
    db: MyraDb,
}

impl TransactionMetadataService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    pub async fn write_metadata(&self, transactions: &mut Vec<Transaction>) -> anyhow::Result<()> {
        self.write_transaction_descriptions(transactions).await?;
        Ok(())
    }

    pub async fn load_metadata(&self, transactions: &mut Vec<Transaction>) -> anyhow::Result<()> {
        self.load_transactions_descriptions(transactions).await?;
        Ok(())
    }

    pub async fn sync_metadata(&self, transactions: &mut Vec<Transaction>) -> anyhow::Result<()> {
        todo!();
    }

    pub async fn write_transaction_descriptions(
        &self,
        transactions: &mut Vec<Transaction>,
    ) -> anyhow::Result<()> {
        let mut update_models: Vec<AddTransactionDescriptionModel> = Vec::new();

        transactions.iter().for_each(|transaction| {
            let transaction_id = transaction.get_transaction_id().unwrap();
            let metadata_fields = transaction.get_metadata_fields();

            for field in metadata_fields {
                if let MetadataField::Description(description) = field {
                    if let Some(description) = description {
                        update_models.push(AddTransactionDescriptionModel {
                            transaction_id,
                            description,
                        });
                    }
                }
            }
        });

        if !update_models.is_empty() {
            let query = transaction_data_queries::insert_descriptions(update_models.clone());
            self.db.execute(query).await?;

            update_models.into_iter().for_each(|model| {
                transactions
                    .iter_mut()
                    .find(|x| x.get_transaction_id() == Some(model.transaction_id))
                    .unwrap()
                    .set_metadata_fields(MetadataField::Description(Some(
                        model.description.clone(),
                    )));
            });
        }

        Ok(())
    }

    async fn load_transactions_descriptions(
        &self,
        transactions: &mut Vec<Transaction>,
    ) -> anyhow::Result<()> {
        let mut transaction_ids: Vec<Uuid> = Vec::new();

        transactions.iter().for_each(|transaction| {
            let transaction_id = transaction.get_transaction_id().unwrap();
            let metadata_fields = transaction.get_metadata_fields();
            for field in metadata_fields {
                if let MetadataField::Description(_) = field {
                    transaction_ids.push(transaction_id);
                }
            }
        });

        if !transaction_ids.is_empty() {
            let query = transaction_data_queries::get_transactions_description(transaction_ids);

            let models = self
                .db
                .fetch_all::<TransactionDescriptionModel>(query)
                .await?;

            models.iter().for_each(|model| {
                transactions
                    .iter_mut()
                    .find(|x| x.get_transaction_id() == Some(model.transaction_id))
                    .unwrap()
                    .set_metadata_fields(MetadataField::Description(Some(
                        model.description.clone(),
                    )));
            });
        }

        Ok(())
    }
}
