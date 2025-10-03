resource "google_service_account" "workbench" {
  project      = var.project_id
  account_id   = "vaultmesh-workbench-sa"
  display_name = "VaultMesh Workbench Service Account"
}

resource "google_project_iam_member" "workbench_vertex_ai_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.workbench.email}"
}

output "workbench_service_account_email" {
  description = "The email of the service account for the workbench."
  value       = google_service_account.workbench.email
}