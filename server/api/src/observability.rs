use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::trace::Tracer;
use opentelemetry_sdk::Resource;
use tower_http::classify::{ServerErrorsAsFailures, SharedClassifier};
use tower_http::trace::{DefaultMakeSpan, TraceLayer};
use tracing::{Level, Subscriber};
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::registry::LookupSpan;
use tracing_subscriber::Layer;
use tracing_subscriber::Registry;
use tracing_subscriber::{prelude::*, EnvFilter};

#[cfg(all(feature = "color-sql", debug_assertions))]
pub(crate) mod sql_highlighter;

pub fn initialize_tracing_subscriber() {
    Registry::default()
        .with(create_print_layer())
        .with(create_env_filter_layer())
        .with(create_opentelemetry_layer())
        .init();
}

#[allow(clippy::type_complexity)]
fn create_opentelemetry_layer<S>() -> Option<OpenTelemetryLayer<S, Tracer>>
where
    S: Subscriber + for<'span> LookupSpan<'span>,
{
    let otlp_endpoint = std::env::var("OTLP_ENDPOINT");
    match otlp_endpoint {
        Ok(endpoint) => {
            let exporter = opentelemetry_otlp::SpanExporter::builder()
                .with_tonic()
                .with_endpoint(endpoint)
                .build();
            
            match exporter {
                Ok(exporter) => {
                    let resource = Resource::builder()
                        .with_service_name("myra_api")
                        .build();
                    
                    let tracer_provider = opentelemetry_sdk::trace::SdkTracerProvider::builder()
                        .with_batch_exporter(exporter)
                        .with_resource(resource)
                        .build();
                    
                    opentelemetry::global::set_tracer_provider(tracer_provider.clone());
                    let telemetry = OpenTelemetryLayer::new(tracer_provider.tracer("myra_api"));
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

//Creates an env filter from RUST_LOG. If its invalid - panics. If its empty or unset - defaults to erros only
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

pub fn create_tower_http_tracing_layer() -> TraceLayer<SharedClassifier<ServerErrorsAsFailures>> {
    TraceLayer::new_for_http().make_span_with(
        DefaultMakeSpan::new()
            .include_headers(false)
            .level(Level::INFO),
    )
    // .on_request(DefaultOnRequest::new().level(Level::INFO))
    // .on_response(
    //     DefaultOnResponse::new()
    //         .level(Level::INFO)
    //         .latency_unit(LatencyUnit::Micros),
    // )
}
