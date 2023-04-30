use opentelemetry::sdk::trace::Tracer;
use opentelemetry_otlp::WithExportConfig;
use tracing_opentelemetry::OpenTelemetryLayer;
use tracing_subscriber::layer::Layered;
use tracing_subscriber::{prelude::*, EnvFilter};
use tracing_subscriber::{Layer, Registry};

pub fn initialize_tracing_subscriber() {
    tracing_subscriber::registry()
        .with(create_print_layer())
        .with(create_env_filter_layer())
        .with(create_opentelemetry_layer())
        .init();
}

fn create_opentelemetry_layer() -> Option<
    OpenTelemetryLayer<
        Layered<Option<EnvFilter>, Layered<Box<dyn Layer<Registry> + Send + Sync>, Registry>>,
        Tracer,
    >,
> {
    let otlp_endpoint = std::env::var("OTLP_ENDPOINT");
    match otlp_endpoint {
        Ok(endpoint) => {
            match opentelemetry_otlp::new_pipeline()
                .tracing()
                .with_exporter(
                    opentelemetry_otlp::new_exporter()
                        .tonic()
                        .with_endpoint(endpoint),
                )
                .install_simple()
            {
                Ok(tracer) => {
                    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);
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
    tracing_subscriber::fmt::layer().boxed()
}

//Creates an env filter from RUST_LOG. If its invalid - panics. If its empty or unset - defaults to erros only
fn create_env_filter_layer() -> Option<EnvFilter> {
    let rust_log = std::env::var("RUST_LOG").unwrap_or_else(|_| {
        println!("RUST_LOG not set. Error environment filter will be used.");
        "".into()
    });
    match tracing_subscriber::EnvFilter::try_new(rust_log) {
        Ok(filter) => return Some(filter),
        Err(err) => {
            println!(
                "Failed to create env filter for tracing. No environment filter will be set. {}",
                err
            );
            None
        }
    }
}
