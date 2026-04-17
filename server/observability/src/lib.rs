use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::trace::Tracer;
use opentelemetry_sdk::Resource;
use tracing::Subscriber;
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::registry::LookupSpan;
use tracing_subscriber::Layer;
use tracing_subscriber::Registry;
use tracing_subscriber::{prelude::*, EnvFilter};

#[cfg(all(feature = "color-sql", debug_assertions))]
pub mod sql_highlighter;

pub fn initialize_tracing_subscriber(service_name: &'static str) {
    Registry::default()
        .with(create_print_layer())
        .with(create_env_filter_layer())
        .with(create_opentelemetry_layer(service_name))
        .init();
}

#[allow(clippy::type_complexity)]
fn create_opentelemetry_layer<S>(
    service_name: &'static str,
) -> Option<OpenTelemetryLayer<S, Tracer>>
where
    S: Subscriber + for<'span> LookupSpan<'span>,
{
    let otlp_endpoint = std::env::var("OTLP_ENDPOINT")
        .or_else(|_| std::env::var("OTLP_PORT").map(|port| format!("http://localhost:{port}")));
    match otlp_endpoint {
        Ok(endpoint) => {
            let exporter = opentelemetry_otlp::SpanExporter::builder()
                .with_tonic()
                .with_endpoint(endpoint)
                .build();

            match exporter {
                Ok(exporter) => {
                    let resource = Resource::builder().with_service_name(service_name).build();

                    let tracer_provider = opentelemetry_sdk::trace::SdkTracerProvider::builder()
                        .with_batch_exporter(exporter)
                        .with_resource(resource)
                        .build();

                    opentelemetry::global::set_tracer_provider(tracer_provider.clone());
                    let telemetry = OpenTelemetryLayer::new(tracer_provider.tracer(service_name));
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
                "OTLP_ENDPOINT was not set. OpenTelemetry will not be enabled. {}",
                err
            );
            None
        }
    }
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
