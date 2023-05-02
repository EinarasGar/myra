use axum::Json;
use uuid::Uuid;

use crate::{
    app_error::AppError,
    states::UsersServiceState,
    view_models::user_view_model::{AddUserViewModel, UserViewModel},
};

#[tracing::instrument(skip(users_service, params), ret, err)]
pub async fn post_user(
    UsersServiceState(users_service): UsersServiceState,
    Json(params): Json<AddUserViewModel>,
) -> Result<Json<UserViewModel>, AppError> {
    let user_id: Uuid = users_service.register_user(params.clone().into()).await?;

    let resp = UserViewModel {
        id: user_id,
        username: params.username,
        default_asset_id: params.default_asset_id,
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

//     use tower::ServiceExt;
//     use uuid::Uuid; // for `oneshot` and `ready`

//     #[tokio::test]
//     async fn hello_world() {
//         let string = "2396480f-0052-4cf0-81dc-8cedbde5ce13";
//         let id = 2;

//         let resString = format!("{}{}", string, id);

//         //generate uuid based on string
//         let uuid = Uuid::new_v5(&Uuid::NAMESPACE_DNS, resString.as_bytes());

//         println!("{}", uuid);
//         // let dbConn = dal::database_connection::MyraDb::new().await.unwrap();
//         // let users_service =
//         //     business::service_collection::users_service::UsersService::new(dbConn.users_collection)
//         //         .await
//         //         .unwrap();

//         // let shared_state = AppState {
//         //     UsersService: users_service,
//         // };

//         // let app = crate::routes::create_router(shared_state);

//         // // `Router` implements `tower::Service<Request<Body>>` so we can
//         // // call it like any tower service, no need to run an HTTP server.
//         // let response = app
//         //     .oneshot(
//         //         Request::builder()
//         //             .uri("/users/getall")
//         //             .body(Body::empty())
//         //             .unwrap(),
//         //     )
//         //     .await
//         //     .unwrap();

//         // assert_eq!(response.status(), StatusCode::OK);

//         // let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
//         // assert_eq!(&body[..], b"Hello from rust!");
//     }
// }
