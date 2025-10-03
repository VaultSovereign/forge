output "infra_nameservers" {
  value = google_dns_managed_zone.infra.name_servers
}
output "infra_zone_id" {
  value = google_dns_managed_zone.infra.id
}

output "vpc_name"         { value = google_compute_network.vmesh.name }
output "subnet_self_link" { value = google_compute_subnetwork.vmesh_app.self_link }
output "sls_connector"    { value = google_vpc_access_connector.vmesh_sls.id }

output "proxy_url" {
  description = "Deployed AI Companion Proxy URL"
  value       = google_cloud_run_v2_service.ai_companion_proxy.uri
}
