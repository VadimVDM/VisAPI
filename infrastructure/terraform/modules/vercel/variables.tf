variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Vercel project name"
  type        = string
}

variable "api_token" {
  description = "Vercel API token"
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

variable "domains" {
  description = "Custom domains"
  type = list(object({
    name = string
  }))
  default = []
}

variable "build_config" {
  description = "Build configuration"
  type = object({
    build_command    = string
    output_directory = string
    framework        = string
    node_version     = string
  })
}

variable "environment_variables" {
  description = "Environment variables"
  type        = map(any)
  default     = {}
}