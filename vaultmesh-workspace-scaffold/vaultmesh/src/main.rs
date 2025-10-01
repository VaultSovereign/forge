use tracing_subscriber::EnvFilter;

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    println!("VaultMesh bootstrap: workspace OK. Use features to enable portal/metrics.");
}
