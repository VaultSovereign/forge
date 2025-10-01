.PHONY: build test fmt clippy ci

build:
	cargo build --workspace --all-features

test:
	cargo test --workspace --all-features -- --nocapture

fmt:
	cargo fmt --all -- --check

clippy:
	cargo clippy --workspace --all-targets --all-features -- -D warnings

ci: fmt clippy build test
