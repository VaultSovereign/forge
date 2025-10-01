output "infra_nameservers" {
  value = google_dns_managed_zone.infra.name_servers
}
output "infra_zone_id" {
  value = google_dns_managed_zone.infra.id
}
