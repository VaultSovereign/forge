variable "project_id" { type = string }
variable "region"     { type = string  default = "europe-west1" }

# DNS
variable "infra_zone_name" { type = string  default = "infra-vaultmesh-cloud" }
variable "infra_domain"    { type = string  default = "vaultmesh.cloud." } # trailing dot required

# Secrets (ids only; values managed separately via Secret Manager versions)
variable "secrets" {
  type    = list(string)
  default = [
    "vaultmesh-dev-openrouter",
    "vaultmesh-dev-db-password",
    "vaultmesh-dev-guardian-signing-key",
    "vaultmesh-prod-openrouter",
    "vaultmesh-prod-db-password",
    "vaultmesh-prod-guardian-signing-key",
  ]
}

variable "workbench_image_tag" {
  type        = string
  description = "Docker image tag (e.g., git SHA) for the workbench service."
}
