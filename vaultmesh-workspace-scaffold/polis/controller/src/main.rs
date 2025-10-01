use axum::{routing::get, Router};
use std::net::SocketAddr;
use tracing_subscriber::EnvFilter;

async fn health() -> &'static str { "ok" }

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let app = Router::new().route("/healthz", get(health));
    let addr = SocketAddr::from(([127,0,0,1], 8080));
    tracing::info!("polis-controller listening on {}", addr);
    axum::Server::bind(&addr).serve(app.into_make_service()).await?;
    Ok(())
}
