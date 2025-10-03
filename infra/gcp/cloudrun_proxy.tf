# Cloud Run v2 service — ai-companion-proxy (auth-only; VPC egress via connector)

resource "google_cloud_run_v2_service" "ai_companion_proxy" {
  name     = "ai-companion-proxy"
  location = var.region
  project  = var.project_id

  # Keep public ingress path; IAM will enforce auth-only
  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.proxy_sa_email

    containers {
      image = var.proxy_image
      ports { container_port = 8080 }

      # Example envs (adjust to your app)
      env { name = "AI_TARGET" value = "https://cloudaicompanion.googleapis.com" }
      env { name = "LOG_LEVEL" value = "info" }
      env { name = "NODE_ENV"  value = "production" }
    }

    vpc_access {
      connector = google_vpc_access_connector.vmesh_sls.id
      egress    = "ALL_TRAFFIC"
    }

    timeout = "60s"
    scaling {
      max_instance_count = 5
      min_instance_count = 0
    }
  }
}

# IAM — auth-only (no allUsers)
resource "google_cloud_run_v2_service_iam_binding" "proxy_invokers" {
  service  = google_cloud_run_v2_service.ai_companion_proxy.name
  location = var.region
  role     = "roles/run.invoker"
  members = compact([
    "serviceAccount:${var.proxy_publisher_sa_email}",
    var.proxy_scheduler_sa_email == "" ? null : "serviceAccount:${var.proxy_scheduler_sa_email}",
  ])
  depends_on = [google_cloud_run_v2_service.ai_companion_proxy]
}
