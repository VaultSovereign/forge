# Import existing secrets; manage new ones declaratively.
resource "google_secret_manager_secret" "secrets" {
  for_each = toset(var.secrets)
  secret_id = each.value
  replication {
    automatic = true
  }
}
# (Optional) you can manage versions later; we won't import the REPLACE_ME versions.
