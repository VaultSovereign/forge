use vaultmesh::receipts_engine::hash_receipt;

#[test]
fn hashes_are_stable_for_same_input() {
    let a = br#"{"id":1,"amount":100}"#;
    let b = br#"{"id":1,"amount":100}"#;
    assert_eq!(hash_receipt(a), hash_receipt(b));
}

#[test]
fn hashes_differ_for_different_input() {
    let a = br#"{"id":1,"amount":100}"#;
    let b = br#"{"id":2,"amount":100}"#;
    assert_ne!(hash_receipt(a), hash_receipt(b));
}
