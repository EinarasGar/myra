use std::collections::HashMap;
use std::sync::Arc;

use anyhow::Result;
#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::file_provider::{FileProvider, FileProviderUnavailableError};
use dal::models::file_models::{FileModel, FileStatus};
use dal::queries::{file_queries, transaction_queries};
use dal::query_params::get_files_params::GetFilesParams;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::dtos::asset_pair_date_dto::AssetPairDateDto;
use crate::dtos::assets::asset_pair_ids_dto::AssetPairIdsDto;
use crate::dtos::exports::export_dto::{ExportDto, ExportFormat};
use crate::dtos::net_worth::range_dto::RangeDto;
use crate::dtos::service_unavailable_error_dto::BusinessServiceUnavailableError;
use crate::entities::export::{CustomAssetManualRate, LedgerExport};
use crate::service_collection::asset_rates_service::AssetRatesService;
use crate::service_collection::user_service::UsersService;

fn convert_provider_error(err: anyhow::Error) -> anyhow::Error {
    if err.downcast_ref::<FileProviderUnavailableError>().is_some() {
        return BusinessServiceUnavailableError {
            message: err.to_string(),
        }
        .into();
    }
    err
}

pub struct LedgerExportService {
    providers: super::ServiceProviders,
    db: MyraDb,
    file_provider: Arc<dyn FileProvider>,
    users_service: UsersService,
    asset_rates_service: AssetRatesService,
}

impl LedgerExportService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            providers: providers.clone(),
            db: providers.db.clone(),
            file_provider: providers.file_provider.clone(),
            users_service: UsersService::new(providers),
            asset_rates_service: AssetRatesService::new(providers),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn create_export(&self, user_id: Uuid, format: ExportFormat) -> Result<ExportDto> {
        let ledger = self.build_ledger(user_id).await?;
        let contents = match format {
            ExportFormat::Csv => ledger.render_csv(),
            ExportFormat::Beancount => ledger.render_beancount(),
        };
        let bytes = contents.into_bytes();

        let file_id = Uuid::new_v4();
        let storage_key = format!("exports/{}/{}.{}", user_id, file_id, format.extension());
        let original_name = export_file_name(format);

        self.file_provider
            .upload(&storage_key, &bytes, format.mime_type())
            .await
            .map_err(convert_provider_error)?;

        let query = file_queries::insert_file(
            file_id,
            user_id,
            original_name,
            format.mime_type().to_string(),
            bytes.len() as i64,
            storage_key.clone(),
            dal::models::file_models::FileStatus::Ready,
        );

        match self.db.fetch_one::<FileModel>(query).await {
            Ok(file) => Ok(ExportDto {
                id: file.id,
                format,
                created_at: file.created_at,
                size_bytes: file.size_bytes,
            }),
            Err(err) => {
                if let Err(delete_err) = self.file_provider.delete(&storage_key).await {
                    tracing::warn!(
                        storage_key = %storage_key,
                        error = %delete_err,
                        "Failed to delete export object after DB insert failure"
                    );
                }
                Err(err.into())
            }
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn list_exports(&self, user_id: Uuid) -> Result<Vec<ExportDto>> {
        let prefix = format!("exports/{}/", user_id);
        let query = file_queries::get_files(
            GetFilesParams::by_key_prefix(user_id, prefix)
                .with_status(FileStatus::Ready)
                .with_created_at_desc(),
        );
        let files: Vec<FileModel> = self.db.fetch_all(query).await?;

        Ok(files
            .into_iter()
            .filter_map(|file| {
                let extension = file.storage_key.rsplit('.').next()?;
                let format = ExportFormat::from_extension(extension)?;
                Some(ExportDto {
                    id: file.id,
                    format,
                    created_at: file.created_at,
                    size_bytes: file.size_bytes,
                })
            })
            .collect())
    }

    async fn build_ledger(&self, user_id: Uuid) -> Result<LedgerExport> {
        let default_asset_id = self.users_service.get_default_asset(user_id).await?;

        let rows: Vec<dal::models::transaction_models::LedgerExportRow> = self
            .db
            .fetch_all(transaction_queries::get_ledger_export_rows(user_id))
            .await?;

        let mut export = LedgerExport::from_rows(rows, default_asset_id);

        let cost_rates = self
            .load_cost_rates(export.rate_inputs(), export.base_pairs())
            .await?;
        export.set_cost_rates(cost_rates);

        let custom_asset_manual_rates = self
            .load_custom_asset_manual_rates(export.custom_asset_rate_pairs())
            .await?;
        export.set_custom_asset_manual_rates(custom_asset_manual_rates);

        Ok(export)
    }

    async fn load_custom_asset_manual_rates(
        &self,
        pairs: &[(i32, i32)],
    ) -> Result<Vec<CustomAssetManualRate>> {
        let mut custom_asset_manual_rates = Vec::new();
        for (asset_id, base_pair_id) in pairs {
            let rates = self
                .asset_rates_service
                .get_pairs_by_range_direct(
                    AssetPairIdsDto {
                        pair1: crate::dtos::assets::asset_id_dto::AssetIdDto(*asset_id),
                        pair2: crate::dtos::assets::asset_id_dto::AssetIdDto(*base_pair_id),
                    },
                    RangeDto::Custom(None, None, None),
                )
                .await?;
            for rate in rates {
                custom_asset_manual_rates.push(CustomAssetManualRate {
                    asset_id: *asset_id,
                    date: rate.date,
                    price: rate.rate,
                });
            }
        }
        Ok(custom_asset_manual_rates)
    }

    async fn load_cost_rates(
        &self,
        rate_inputs: &[(i32, OffsetDateTime)],
        base_pairs: &HashMap<i32, i32>,
    ) -> Result<HashMap<(i32, OffsetDateTime), rust_decimal::Decimal>> {
        let mut pair_dates = Vec::new();
        let mut keys = Vec::new();
        for (asset_id, date) in rate_inputs {
            let asset_id = *asset_id;
            let date = *date;
            let Some(base_pair_id) = base_pairs.get(&asset_id) else {
                continue;
            };
            pair_dates.push(AssetPairDateDto {
                asset1_id: asset_id,
                asset2_id: *base_pair_id,
                date,
            });
            keys.push((asset_id, date));
        }

        if pair_dates.is_empty() {
            return Ok(HashMap::new());
        }

        let results = self
            .asset_rates_service
            .get_pair_prices_by_dates(pair_dates)
            .await?;
        let mut cost_rates = HashMap::new();
        for (key, result) in keys.into_iter().zip(results) {
            if let Some(rate) = result {
                cost_rates.insert(key, rate.rate);
            }
        }
        Ok(cost_rates)
    }
}

fn export_file_name(format: ExportFormat) -> String {
    let today = OffsetDateTime::now_utc().date();
    format!(
        "sverto-ledger-{:04}-{:02}-{:02}.{}",
        today.year(),
        u8::from(today.month()),
        today.day(),
        format.extension()
    )
}
