use crate::{handlers, AppState};
use axum::{
    routing::{get, post},
    Router,
};
use tower_http::trace::TraceLayer;

pub(crate) fn create_router(state: AppState) -> Router {
    let app = Router::new()
        // .route("/api", get(index))
        // .route("/api/hello", get(hello))
        .route("/users", post(handlers::users::post_user))
        .route(
            "/users/:id/transactions",
            post(handlers::transactions::post_transactions),
        )
        .route(
            "/users/:id/portfolio",
            get(handlers::portfolio::get_portfolio),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state);
    app
}
