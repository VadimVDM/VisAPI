locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
    CreatedAt   = timestamp()
  }
  
  frontend_subdomain = var.environment == "production" ? "app" : "app-staging"
  backend_subdomain  = var.environment == "production" ? "api" : "api-staging"
}

# Upstash Redis for Queue Management
module "upstash" {
  source = "./modules/upstash"
  
  environment   = var.environment
  project_name  = var.project_name
  region        = var.region
  api_key       = var.upstash_api_key
  email         = var.upstash_email
  
  redis_config = {
    name            = "${var.project_name}-${var.environment}-redis"
    tls             = true
    eviction        = true
    persistence     = "aof"
    max_connections = 1000
    max_memory      = "256" # MB
  }
}

# Vercel Frontend Deployment
module "vercel" {
  source = "./modules/vercel"
  
  environment     = var.environment
  project_name    = "${var.project_name}-frontend"
  api_token       = var.vercel_api_token
  github_repo     = var.github_repo
  github_branch   = var.github_branch
  
  domains = [{
    name = "${local.frontend_subdomain}.${var.domain}"
  }]
  
  build_config = {
    build_command    = "pnpm nx build frontend"
    output_directory = "apps/frontend/.next"
    framework        = "nextjs"
    node_version     = var.node_version
  }
  
  environment_variables = {
    # Public variables
    NEXT_PUBLIC_API_URL              = "https://${local.backend_subdomain}.${var.domain}"
    NEXT_PUBLIC_SUPABASE_URL         = "https://${var.supabase_project_id}.supabase.co"
    NEXT_PUBLIC_SUPABASE_ANON_KEY    = data.supabase_project.main.anon_key
    
    # Server-side variables (encrypted)
    SUPABASE_SERVICE_KEY = {
      value     = data.supabase_project.main.service_key
      sensitive = true
    }
  }
}

# Render Backend Services
module "render" {
  source = "./modules/render"
  
  environment   = var.environment
  project_name  = var.project_name
  api_key       = var.render_api_key
  github_repo   = var.github_repo
  github_branch = var.github_branch
  region        = var.region
  
  # API Gateway Service
  gateway_config = {
    name              = "${var.project_name}-${var.environment}-gateway"
    type              = "web"
    plan              = var.environment == "production" ? "standard" : "starter"
    build_command     = "pnpm install && pnpm nx build backend"
    start_command     = "node dist/apps/backend/main.js"
    health_check_path = "/api/v1/healthz"
    
    domains = [{
      name = "${local.backend_subdomain}.${var.domain}"
    }]
    
    scaling = {
      min_instances = var.environment == "production" ? 2 : 1
      max_instances = var.environment == "production" ? 10 : 3
    }
  }
  
  # Worker Service
  worker_config = {
    name          = "${var.project_name}-${var.environment}-worker"
    type          = "worker"
    plan          = var.environment == "production" ? "standard" : "starter"
    build_command = "pnpm install && pnpm nx build worker"
    start_command = "node dist/apps/worker/main.js"
    dockerfile    = "./worker/Dockerfile"
    
    scaling = {
      min_instances = var.environment == "production" ? 2 : 1
      max_instances = var.environment == "production" ? 5 : 2
    }
  }
  
  # Shared environment variables
  environment_variables = {
    NODE_ENV                = var.environment
    DATABASE_URL            = data.supabase_project.main.database_url
    REDIS_URL               = module.upstash.redis_url
    REDIS_TLS_URL           = module.upstash.redis_tls_url
    SUPABASE_URL            = "https://${var.supabase_project_id}.supabase.co"
    SUPABASE_SERVICE_KEY    = data.supabase_project.main.service_key
    SUPABASE_ANON_KEY       = data.supabase_project.main.anon_key
    FRONTEND_URL            = "https://${local.frontend_subdomain}.${var.domain}"
    BACKEND_URL             = "https://${local.backend_subdomain}.${var.domain}"
    LOG_LEVEL               = var.environment == "production" ? "info" : "debug"
    RATE_LIMIT_WINDOW_MS    = "60000"
    RATE_LIMIT_MAX_REQUESTS = "200"
  }
}

# Data source for existing Supabase project
data "supabase_project" "main" {
  id = var.supabase_project_id
}

# Monitoring and Alerting Configuration
resource "github_repository_file" "grafana_dashboard" {
  repository = split("/", var.github_repo)[1]
  branch     = var.github_branch
  file       = "infrastructure/monitoring/dashboards/visapi-dashboard.json"
  content    = file("${path.module}/templates/grafana-dashboard.json")
  
  commit_message = "feat: add Grafana dashboard configuration"
  commit_author  = "Terraform"
  commit_email   = "terraform@visapi.com"
}

# Grafana Cloud Alert Rules Configuration
module "grafana_cloud" {
  source = "./modules/grafana-cloud"
  
  environment   = var.environment
  project_name  = var.project_name
  
  grafana_cloud_api_key    = var.grafana_cloud_api_key
  grafana_cloud_stack_id   = var.grafana_cloud_stack_id
  grafana_cloud_org_id     = var.grafana_cloud_org_id
  
  slack_webhook_url           = var.slack_webhook_url
  pagerduty_integration_key   = var.pagerduty_integration_key
  
  alert_rules_config = {
    api_latency_threshold_ms = var.environment == "production" ? 200 : 500
    error_rate_threshold     = var.environment == "production" ? 5 : 10
    queue_depth_threshold    = var.environment == "production" ? 1000 : 2000
  }
}

# Export important values
output "frontend_url" {
  value = "https://${local.frontend_subdomain}.${var.domain}"
}

output "backend_url" {
  value = "https://${local.backend_subdomain}.${var.domain}"
}

output "redis_connection" {
  value = {
    host = module.upstash.redis_host
    port = module.upstash.redis_port
  }
  sensitive = true
}

output "deployment_info" {
  value = {
    environment    = var.environment
    gateway_id     = module.render.gateway_service_id
    worker_id      = module.render.worker_service_id
    frontend_id    = module.vercel.project_id
    redis_db_id    = module.upstash.redis_database_id
  }
}

output "monitoring_info" {
  value = {
    grafana_folder_uid   = module.grafana_cloud.folder_uid
    alert_rules          = module.grafana_cloud.alert_rules
    contact_points       = module.grafana_cloud.contact_points
    notification_policy  = module.grafana_cloud.notification_policy
  }
  sensitive = true
}