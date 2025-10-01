pub mod receipts_engine {
    use blake3::Hasher;

    /// Hash a receipt (as JSON bytes) and return hex digest.
    pub fn hash_receipt(json_bytes: &[u8]) -> String {
        let mut hasher = Hasher::new();
        hasher.update(json_bytes);
        hasher.finalize().to_hex().to_string()
    }
}

#[cfg(feature = "pq_signer")]
pub mod pq_signer {
    /// Placeholder API behind feature flag. Not implemented yet.
    pub fn sign(_msg: &[u8]) -> Result<Vec<u8>, &'static str> {
        Err("pq_signer feature enabled but signer not implemented")
    }
}
