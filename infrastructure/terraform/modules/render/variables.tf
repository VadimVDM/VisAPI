variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "api_key" {
  description = "Render API key"
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "GitHub repository"
  type        = string
}

variable "github_branch" {
  description = "GitHub branch"
  type        = string
}

variable "region" {
  description = "Render region"
  type        = string
  default     = "oregon"
}

variable "gateway_config" {
  description = "Gateway service configuration"
  type = object({
    name              = string
    type              = string
    plan              = string
    build_command     = string
    start_command     = string
    health_check_path = string
    domains = list(object({
      name = string
    }))
    scaling = object({
      min_instances = number
      max_instances = number
    })
  })
}

variable "worker_config" {
  description = "Worker service configuration"
  type = object({
    name          = string
    type          = string
    plan          = string
    build_command = string
    start_command = string
    dockerfile    = string
    scaling = object({
      min_instances = number
      max_instances = number
    })
  })
}

variable "environment_variables" {
  description = "Environment variables for services"
  type        = map(string)
  default     = {}
  sensitive   = true
}