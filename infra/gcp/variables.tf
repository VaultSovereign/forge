variable "project_id" { type = string }
variable "region"     { type = string  default = "europe-west3" }

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

# Network (VPC + NAT + Serverless Connector)
variable "vpc_name" { type = string  default = "vm-vaultmesh" }
variable "subnet_cidr" {
  type        = string
  description = "App subnet CIDR (no overlap with connector)"
  default     = "10.101.0.0/20"
}
variable "serverless_connector_cidr" {
  type        = string
  description = "Serverless VPC Access connector /28–/24"
  default     = "10.101.16.0/28"
}

# Cloud Run image and IAM
variable "workbench_image" {
  type        = string
  description = "Full image path for workbench (if set, takes precedence over tag)."
  default     = ""
}
variable "publisher_sa_email" { type = string  default = "" }
variable "scheduler_sa_email" { type = string  default = "" }

# Proxy-specific (Cloud Run v2)
variable "proxy_image" {
  type        = string
  description = "Full image path for ai-companion-proxy (e.g., europe-west3-docker.pkg.dev/PROJECT/vaultmesh/proxy:sha)"
}
variable "proxy_sa_email" {
  type        = string
  description = "Runtime service account email for ai-companion-proxy"
}
variable "proxy_publisher_sa_email" {
  type        = string
  description = "Publisher/caller SA allowed to invoke ai-companion-proxy"
}
variable "proxy_scheduler_sa_email" {
  type        = string
  description = "Optional scheduler SA allowed to invoke ai-companion-proxy"
  default     = ""
}
