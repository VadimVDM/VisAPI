variable "environment" {
  description = "Environment name (staging or production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either staging or production"
  }
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "visapi"
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo"
  type        = string
  default     = "visanet/visapi"
}

variable "github_branch" {
  description = "GitHub branch to deploy from"
  type        = string
  default     = "main"
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "us-east-1"
}

variable "domain" {
  description = "Base domain for the application"
  type        = string
  default     = "visanet.app"
}

variable "supabase_org_id" {
  description = "Supabase organization ID"
  type        = string
  sensitive   = true
}

variable "supabase_project_id" {
  description = "Existing Supabase project ID"
  type        = string
  default     = "pangdzwamawwgmvxnwkk"
}

variable "render_api_key" {
  description = "Render API key"
  type        = string
  sensitive   = true
}

variable "vercel_api_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "upstash_api_key" {
  description = "Upstash API key"
  type        = string
  sensitive   = true
}

variable "upstash_email" {
  description = "Upstash account email"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  sensitive   = true
}

variable "alert_email" {
  description = "Email for critical alerts"
  type        = string
}

variable "node_version" {
  description = "Node.js version for builds"
  type        = string
  default     = "20"
}

# Grafana Cloud Configuration
variable "grafana_cloud_api_key" {
  description = "Grafana Cloud API key"
  type        = string
  sensitive   = true
}

variable "grafana_cloud_stack_id" {
  description = "Grafana Cloud stack ID"
  type        = string
  sensitive   = true
}

variable "grafana_cloud_org_id" {
  description = "Grafana Cloud organization ID"
  type        = string
  sensitive   = true
}

variable "pagerduty_integration_key" {
  description = "PagerDuty integration key for critical alerts"
  type        = string
  sensitive   = true
  default     = ""
}