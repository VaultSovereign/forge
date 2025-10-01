resource "google_dns_managed_zone" "infra" {
  name        = var.infra_zone_name
  dns_name    = var.infra_domain
  description = "VaultMesh INFRA zone"
  visibility  = "public"
}
