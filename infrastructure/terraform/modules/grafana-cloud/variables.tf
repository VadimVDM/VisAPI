variable "environment" {
  description = "Environment name (staging or production)"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

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

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  sensitive   = true
}

variable "pagerduty_integration_key" {
  description = "PagerDuty integration key for critical alerts"
  type        = string
  sensitive   = true
  default     = ""
}

variable "alert_rules_config" {
  description = "Configuration for alert rule thresholds"
  type = object({
    api_latency_threshold_ms = number
    error_rate_threshold     = number
    queue_depth_threshold    = number
  })
  default = {
    api_latency_threshold_ms = 200
    error_rate_threshold     = 5
    queue_depth_threshold    = 1000
  }
}