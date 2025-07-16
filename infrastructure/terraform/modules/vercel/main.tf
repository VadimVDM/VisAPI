terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0.0"
    }
  }
}

# Create Vercel project
resource "vercel_project" "frontend" {
  name      = var.project_name
  framework = var.build_config.framework
  
  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.github_branch
  }
  
  build_command    = var.build_config.build_command
  output_directory = var.build_config.output_directory
  node_version     = var.build_config.node_version
  
  # Enable automatic deployments
  automatically_expose_system_environment_variables = true
  
  # Serverless functions configuration
  serverless_function_region = var.environment == "production" ? ["iad1", "sfo1"] : ["iad1"]
  
  # Build & Development Settings
  root_directory = "."
  ignore_command = "git diff --quiet HEAD^ HEAD apps/frontend/"
}

# Configure custom domains
resource "vercel_project_domain" "custom" {
  for_each = { for d in var.domains : d.name => d }
  
  project_id = vercel_project.frontend.id
  domain     = each.value.name
}

# Set environment variables
resource "vercel_project_environment_variable" "env_vars" {
  for_each = var.environment_variables
  
  project_id = vercel_project.frontend.id
  key        = each.key
  value      = try(each.value.value, each.value)
  target     = [var.environment]
  
  sensitive = try(each.value.sensitive, false)
}

# Configure deployment protection
resource "vercel_deployment_protection" "main" {
  count = var.environment == "production" ? 1 : 0
  
  project_id = vercel_project.frontend.id
  enabled    = true
}

# Outputs
output "project_id" {
  value = vercel_project.frontend.id
}

output "project_url" {
  value = "https://${vercel_project.frontend.name}.vercel.app"
}

output "custom_domains" {
  value = [for d in vercel_project_domain.custom : d.domain]
}