use opentelemetry::trace::TracerProvider;
use opentelemetry_appender_tracing::layer::OpenTelemetryTracingBridge;
use opentelemetry_otlp::{WithExportConfig, WithHttpConfig};
use opentelemetry_sdk::logs::{SdkLogger, SdkLoggerProvider};
use opentelemetry_sdk::trace::SdkTracerProvider;
use opentelemetry_sdk::Resource;
use std::collections::HashMap;
use std::sync::OnceLock;
use tracing::Subscriber;
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::filter::filter_fn;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::registry::LookupSpan;
use tracing_subscriber::Layer;
use tracing_subscriber::Registry;
use tracing_subscriber::{prelude::*, EnvFilter};

#[cfg(all(feature = "color-sql", debug_assertions))]
pub mod sql_highlighter;

static TRACER_PROVIDER: OnceLock<SdkTracerProvider> = OnceLock::new();
static LOGGER_PROVIDER: OnceLock<SdkLoggerProvider> = OnceLock::new();

pub fn initialize_tracing_subscriber(service_name: &'static str) {
    opentelemetry::global::set_text_map_propagator(
        opentelemetry_sdk::propagation::TraceContextPropagator::new(),
    );

    Registry::default()
        .with(create_print_layer())
        .with(create_env_filter_layer())
        .with(create_opentelemetry_layer(service_name))
        .with(create_opentelemetry_log_layer(service_name))
        .init();
}

pub use reqwest_middleware::ClientWithMiddleware as TracedHttpClient;
pub use reqwest_middleware::RequestBuilder as TracedRequestBuilder;

pub fn create_http_client() -> TracedHttpClient {
    reqwest_middleware::ClientBuilder::new(reqwest::Client::new())
        .with(reqwest_tracing::TracingMiddleware::default())
        .build()
}

pub fn shutdown_tracing() {
    if let Some(provider) = TRACER_PROVIDER.get() {
        let _ = provider.shutdown();
    }
    if let Some(provider) = LOGGER_PROVIDER.get() {
        let _ = provider.shutdown();
    }
}

#[allow(clippy::type_complexity)]
fn create_opentelemetry_layer<S>(
    service_name: &'static str,
) -> Option<Box<dyn Layer<S> + Send + Sync + 'static>>
where
    S: Subscriber + for<'span> LookupSpan<'span> + Send + Sync + 'static,
{
    let otlp_endpoint =
        std::env::var("OTLP_TRACES_ENDPOINT").or_else(|_| std::env::var("OTLP_ENDPOINT"));
    match otlp_endpoint {
        Ok(endpoint) => {
            let headers = create_otlp_headers();
            println!("OTLP/HTTP trace export enabled");
            let exporter = opentelemetry_otlp::SpanExporter::builder()
                .with_http()
                .with_endpoint(endpoint)
                .with_headers(headers)
                .build();

            match exporter {
                Ok(exporter) => {
                    let resource = Resource::builder().with_service_name(service_name).build();

                    let tracer_provider = opentelemetry_sdk::trace::SdkTracerProvider::builder()
                        .with_batch_exporter(exporter)
                        .with_resource(resource)
                        .build();

                    opentelemetry::global::set_tracer_provider(tracer_provider.clone());
                    let telemetry = OpenTelemetryLayer::new(tracer_provider.tracer(service_name))
                        .with_filter(filter_fn(|metadata| metadata.is_span()))
                        .boxed();
                    let _ = TRACER_PROVIDER.set(tracer_provider);
                    Some(telemetry)
                }
                Err(err) => {
                    println!(
                        "Error setting up OpenTelemetry tracing. OpenTelemetry will not be enabled. {}",
                        err
                    );
                    None
                }
            }
        }
        Err(err) => {
            println!(
                "OTLP_TRACES_ENDPOINT was not set. OpenTelemetry tracing will not be enabled. {}",
                err
            );
            None
        }
    }
}

fn create_opentelemetry_log_layer(
    service_name: &'static str,
) -> Option<OpenTelemetryTracingBridge<SdkLoggerProvider, SdkLogger>> {
    match std::env::var("OTLP_LOGS_ENDPOINT") {
        Ok(endpoint) => {
            let headers = create_otlp_headers();
            println!("OTLP/HTTP log export enabled");
            let exporter = opentelemetry_otlp::LogExporter::builder()
                .with_http()
                .with_endpoint(endpoint)
                .with_headers(headers)
                .build();

            match exporter {
                Ok(exporter) => {
                    let resource = Resource::builder().with_service_name(service_name).build();
                    let logger_provider = SdkLoggerProvider::builder()
                        .with_resource(resource)
                        .with_batch_exporter(exporter)
                        .build();
                    let layer = OpenTelemetryTracingBridge::new(&logger_provider);
                    let _ = LOGGER_PROVIDER.set(logger_provider);
                    Some(layer)
                }
                Err(err) => {
                    println!(
                        "Error setting up OpenTelemetry logs. OpenTelemetry logs will not be enabled. {}",
                        err
                    );
                    None
                }
            }
        }
        Err(_) => None,
    }
}

fn create_otlp_headers() -> HashMap<String, String> {
    let mut headers = HashMap::new();
    if let Ok(token) = std::env::var("OTLP_AUTH_TOKEN") {
        headers.insert("Authorization".to_string(), format!("Bearer {token}"));
    }
    if let Ok(dataset) = std::env::var("AXIOM_DATASET") {
        headers.insert("X-Axiom-Dataset".to_string(), dataset);
    }
    headers
}

fn create_print_layer() -> Box<dyn Layer<Registry> + Send + Sync> {
    let layer = tracing_subscriber::fmt::layer().pretty();

    #[cfg(all(feature = "color-sql", debug_assertions))]
    let layer = layer.fmt_fields(sql_highlighter::create_tracing_formatter());

    layer.boxed()
}

/// Creates an env filter from `RUST_LOG`. If invalid, panics. If empty or unset,
/// falls back to the default (errors only).
fn create_env_filter_layer() -> Option<EnvFilter> {
    let rust_log = std::env::var("RUST_LOG").unwrap_or_else(|_| {
        println!("RUST_LOG not set. Error environment filter will be used.");
        "".into()
    });
    match tracing_subscriber::EnvFilter::try_new(rust_log) {
        Ok(filter) => Some(filter),
        Err(err) => {
            println!(
                "Failed to create env filter for tracing. No environment filter will be set. {}",
                err
            );
            None
        }
    }
}
