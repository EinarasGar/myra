use axum::Json;

use log::trace;
use uuid::Uuid;

use crate::{
    app_error::AppError,
    states::UsersServiceState,
    view_models::user_view_model::{AddUserReqData, UserRespData},
};

pub async fn post_user(
    UsersServiceState(users_service): UsersServiceState,
    Json(params): Json<AddUserReqData>,
) -> Result<Json<UserRespData>, AppError> {
    trace!("POST /users was called - {:?}", params);

    let user_id: Uuid = users_service.register_user(params.clone()).await?;

    let resp = UserRespData {
        id: user_id,
        username: params.username,
        default_asset: params.default_asset,
    };
    Ok(resp.into())
}

// #[cfg(test)]
// mod tests {
//     use crate::AppState;

//     use axum::{
//         body::Body,
//         http::{Request, StatusCode},
//     };

//     use tower::ServiceExt; // for `oneshot` and `ready`

//     #[tokio::test]
//     async fn hello_world() {
//         let dbConn = dal::database_connection::MyraDb::new().await.unwrap();
//         let users_service =
//             business::service_collection::users_service::UsersService::new(dbConn.users_collection)
//                 .await
//                 .unwrap();

//         let shared_state = AppState {
//             UsersService: users_service,
//         };

//         let app = crate::routes::create_router(shared_state);

//         // `Router` implements `tower::Service<Request<Body>>` so we can
//         // call it like any tower service, no need to run an HTTP server.
//         let response = app
//             .oneshot(
//                 Request::builder()
//                     .uri("/users/getall")
//                     .body(Body::empty())
//                     .unwrap(),
//             )
//             .await
//             .unwrap();

//         assert_eq!(response.status(), StatusCode::OK);

//         let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
//         assert_eq!(&body[..], b"Hello from rust!");
//     }
// }
