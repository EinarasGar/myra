#[mockall_double::double]
use dal::database_context::MyraDb;

use dal::{
    models::transaction_models::{
        AddTransactionDescriptionModel, AddTransactionDividendModel, TransactionDescriptionModel,
        TransactionDividendModel,
    },
    queries::transaction_data_queries,
};
use uuid::Uuid;

use crate::entities::transactions::{metadata::MetadataField, transaction::Transaction};

use super::ai_embedding_service::AiEmbeddingService;

pub struct TransactionMetadataService {
    db: MyraDb,
    embedding_service: AiEmbeddingService,
}

impl TransactionMetadataService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            embedding_service: AiEmbeddingService::new(db.clone()),
            db,
        }
    }

    pub async fn write_metadata(&self, transactions: &mut [Transaction]) -> anyhow::Result<()> {
        self.write_transaction_descriptions(transactions).await?;
        self.write_transaction_dividends(transactions).await?;
        Ok(())
    }

    pub async fn load_metadata(&self, transactions: &mut [Transaction]) -> anyhow::Result<()> {
        self.load_transactions_descriptions(transactions).await?;
        self.load_transactions_dividends(transactions).await?;
        Ok(())
    }

    pub async fn update_metadata(
        &self,
        old_transaction: &Transaction,
        new_transaction: &mut Transaction,
    ) -> anyhow::Result<()> {
        let transaction_id = new_transaction
            .get_transaction_id()
            .expect("Transaction must have an id for update");

        self.diff_descriptions(transaction_id, old_transaction, new_transaction)
            .await?;
        self.diff_dividends(transaction_id, old_transaction, new_transaction)
            .await?;

        Ok(())
    }

    async fn diff_descriptions(
        &self,
        transaction_id: Uuid,
        old_transaction: &Transaction,
        new_transaction: &mut Transaction,
    ) -> anyhow::Result<()> {
        let old_desc = old_transaction
            .get_metadata_fields()
            .into_iter()
            .find_map(|f| match f {
                MetadataField::Description(v) => Some(v),
                _ => None,
            })
            .flatten();

        let new_desc = new_transaction
            .get_metadata_fields()
            .into_iter()
            .find_map(|f| match f {
                MetadataField::Description(v) => Some(v),
                _ => None,
            })
            .flatten();

        match (old_desc, &new_desc) {
            (Some(old_val), Some(new_val)) => {
                if old_val != *new_val {
                    let query = transaction_data_queries::update_description(
                        transaction_id,
                        new_val.clone(),
                    );
                    self.db.execute(query).await?;
                    self.embedding_service
                        .spawn_embed_transaction(transaction_id, new_val.clone());
                }
            }
            (None, Some(new_val)) => {
                let query = transaction_data_queries::insert_descriptions(vec![
                    AddTransactionDescriptionModel {
                        transaction_id,
                        description: new_val.clone(),
                    },
                ]);
                self.db.execute(query).await?;
                self.embedding_service
                    .spawn_embed_transaction(transaction_id, new_val.clone());
            }
            (Some(_), None) => {
                let query = transaction_data_queries::delete_descriptions_by_transaction_ids(vec![
                    transaction_id,
                ]);
                self.db.execute(query).await?;
            }
            (None, None) => {}
        }

        if let Some(desc) = new_desc {
            new_transaction.set_metadata_fields(MetadataField::Description(Some(desc)));
        }

        Ok(())
    }

    async fn diff_dividends(
        &self,
        transaction_id: Uuid,
        old_transaction: &Transaction,
        new_transaction: &mut Transaction,
    ) -> anyhow::Result<()> {
        let old_div = old_transaction
            .get_metadata_fields()
            .into_iter()
            .find_map(|f| match f {
                MetadataField::Dividends(v) => Some(v),
                _ => None,
            })
            .flatten();

        let new_div = new_transaction
            .get_metadata_fields()
            .into_iter()
            .find_map(|f| match f {
                MetadataField::Dividends(v) => Some(v),
                _ => None,
            })
            .flatten();

        match (old_div, new_div) {
            (Some(old_asset_id), Some(new_asset_id)) => {
                if old_asset_id != new_asset_id {
                    let query =
                        transaction_data_queries::update_dividend(transaction_id, new_asset_id);
                    self.db.execute(query).await?;
                }
            }
            (None, Some(new_asset_id)) => {
                let query =
                    transaction_data_queries::insert_dividends(vec![AddTransactionDividendModel {
                        transaction_id,
                        source_asset_id: new_asset_id,
                    }]);
                self.db.execute(query).await?;
            }
            (Some(_), None) => {
                let query = transaction_data_queries::delete_dividends_by_transaction_ids(vec![
                    transaction_id,
                ]);
                self.db.execute(query).await?;
            }
            (None, None) => {}
        }

        if let Some(asset_id) = new_div {
            new_transaction.set_metadata_fields(MetadataField::Dividends(Some(asset_id)));
        }

        Ok(())
    }

    pub async fn write_transaction_descriptions(
        &self,
        transactions: &mut [Transaction],
    ) -> anyhow::Result<()> {
        let mut update_models: Vec<AddTransactionDescriptionModel> = Vec::new();

        transactions.iter().for_each(|transaction| {
            let transaction_id = transaction.get_transaction_id().unwrap();
            let metadata_fields = transaction.get_metadata_fields();

            for field in metadata_fields {
                if let MetadataField::Description(Some(description)) = field {
                    update_models.push(AddTransactionDescriptionModel {
                        transaction_id,
                        description,
                    });
                }
            }
        });

        if !update_models.is_empty() {
            let query = transaction_data_queries::insert_descriptions(update_models.clone());
            self.db.execute(query).await?;

            for model in &update_models {
                self.embedding_service
                    .spawn_embed_transaction(model.transaction_id, model.description.clone());
            }

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

    async fn write_transaction_dividends(
        &self,
        transactions: &mut [Transaction],
    ) -> anyhow::Result<()> {
        let mut update_models: Vec<AddTransactionDividendModel> = Vec::new();

        transactions.iter().for_each(|transaction| {
            let transaction_id = transaction.get_transaction_id().unwrap();
            let metadata_fields = transaction.get_metadata_fields();

            for field in metadata_fields {
                if let MetadataField::Dividends(Some(source_asset_id)) = field {
                    update_models.push(AddTransactionDividendModel {
                        transaction_id,
                        source_asset_id,
                    });
                }
            }
        });

        if !update_models.is_empty() {
            let query = transaction_data_queries::insert_dividends(update_models.clone());
            self.db.execute(query).await?;

            update_models.into_iter().for_each(|model| {
                transactions
                    .iter_mut()
                    .find(|x| x.get_transaction_id() == Some(model.transaction_id))
                    .unwrap()
                    .set_metadata_fields(MetadataField::Dividends(Some(model.source_asset_id)));
            });
        }

        Ok(())
    }

    async fn load_transactions_dividends(
        &self,
        transactions: &mut [Transaction],
    ) -> anyhow::Result<()> {
        let mut transaction_ids: Vec<Uuid> = Vec::new();

        transactions.iter().for_each(|transaction| {
            let transaction_id = transaction.get_transaction_id().unwrap();
            let metadata_fields = transaction.get_metadata_fields();
            for field in metadata_fields {
                if let MetadataField::Dividends(_) = field {
                    transaction_ids.push(transaction_id);
                }
            }
        });

        if !transaction_ids.is_empty() {
            let query = transaction_data_queries::get_transactions_dividends(transaction_ids);

            let models = self.db.fetch_all::<TransactionDividendModel>(query).await?;

            models.iter().for_each(|model| {
                transactions
                    .iter_mut()
                    .find(|x| x.get_transaction_id() == Some(model.transaction_id))
                    .unwrap()
                    .set_metadata_fields(MetadataField::Dividends(Some(model.source_asset_id)));
            });
        }

        Ok(())
    }

    async fn load_transactions_descriptions(
        &self,
        transactions: &mut [Transaction],
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
