# Log-based metric you created (receipts counter)
resource "google_logging_metric" "receipts" {
  name        = "vaultmesh-receipts"
  description = "Count receipts emitted"
  filter      = "resource.type=\"cloud_run_revision\" AND textPayload:\"receipts_emitted_total\""
}
