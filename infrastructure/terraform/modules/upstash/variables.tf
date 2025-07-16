variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "region" {
  description = "Upstash region"
  type        = string
}

variable "api_key" {
  description = "Upstash API key"
  type        = string
  sensitive   = true
}

variable "email" {
  description = "Upstash account email"
  type        = string
  sensitive   = true
}

variable "redis_config" {
  description = "Redis configuration"
  type = object({
    name            = string
    tls             = bool
    eviction        = bool
    persistence     = string
    max_connections = number
    max_memory      = string
  })
}