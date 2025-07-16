terraform {
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "~> 1.3.0"
    }
  }
}

# API Gateway Web Service
resource "render_web_service" "gateway" {
  name               = var.gateway_config.name
  plan               = var.gateway_config.plan
  region             = var.region
  start_command      = var.gateway_config.start_command
  build_command      = var.gateway_config.build_command
  runtime            = "node"
  
  source_code = {
    github = {
      repo_url         = "https://github.com/${var.github_repo}"
      branch           = var.github_branch
      auto_deploy      = true
      build_filter     = "apps/backend/**"
    }
  }
  
  health_check = {
    path = var.gateway_config.health_check_path
  }
  
  # Auto-scaling configuration
  num_instances     = var.gateway_config.scaling.min_instances
  max_num_instances = var.gateway_config.scaling.max_instances
  
  lifecycle {
    create_before_destroy = true
  }
}

# Worker Background Service
resource "render_background_worker" "worker" {
  name               = var.worker_config.name
  plan               = var.worker_config.plan
  region             = var.region
  start_command      = var.worker_config.start_command
  build_command      = var.worker_config.build_command
  runtime            = "docker"
  docker_file_path   = var.worker_config.dockerfile
  
  source_code = {
    github = {
      repo_url         = "https://github.com/${var.github_repo}"
      branch           = var.github_branch
      auto_deploy      = true
      build_filter     = "apps/worker/**"
    }
  }
  
  # Auto-scaling configuration
  num_instances     = var.worker_config.scaling.min_instances
  max_num_instances = var.worker_config.scaling.max_instances
  
  lifecycle {
    create_before_destroy = true
  }
}

# Environment variables for Gateway
resource "render_env_var" "gateway_vars" {
  for_each = var.environment_variables
  
  service_id = render_web_service.gateway.id
  key        = each.key
  value      = each.value
}

# Environment variables for Worker
resource "render_env_var" "worker_vars" {
  for_each = var.environment_variables
  
  service_id = render_background_worker.worker.id
  key        = each.key
  value      = each.value
}

# Custom domains for Gateway
resource "render_custom_domain" "gateway_domains" {
  for_each = { for d in var.gateway_config.domains : d.name => d }
  
  service_id = render_web_service.gateway.id
  name       = each.value.name
}

# Outputs
output "gateway_service_id" {
  value = render_web_service.gateway.id
}

output "gateway_service_url" {
  value = render_web_service.gateway.service_url
}

output "worker_service_id" {
  value = render_background_worker.worker.id
}

output "custom_domains" {
  value = [for d in render_custom_domain.gateway_domains : d.name]
}