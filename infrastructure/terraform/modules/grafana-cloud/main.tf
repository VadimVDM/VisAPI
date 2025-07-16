# Grafana Cloud Alert Rules Configuration Module
# Manages Grafana Cloud alert rules, contact points, and notification policies

terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 3.0"
    }
  }
}

provider "grafana" {
  url = "https://${var.grafana_cloud_stack_id}.grafana.net"
  auth = var.grafana_cloud_api_key
}

# Create folder for VisAPI alerts
resource "grafana_folder" "visapi_alerts" {
  title = "VisAPI Alerts"
}

# Data source for Prometheus
data "grafana_data_source" "prometheus" {
  name = "prometheus"
}

# API Latency Alert Rule
resource "grafana_rule_group" "api_latency" {
  name             = "visapi-api-latency"
  folder_uid       = grafana_folder.visapi_alerts.uid
  interval_seconds = 60
  
  rule {
    name           = "High API Latency (p95)"
    condition      = "B"
    exec_err_state = "Alerting"
    no_data_state  = "NoData"
    for            = "5m"
    
    annotations = {
      description = "API endpoint {{ $labels.route }} has p95 latency of {{ $value }}ms (threshold: ${var.alert_rules_config.api_latency_threshold_ms}ms)"
      runbook_url = "https://github.com/visanet/visapi/wiki/runbooks/high-api-latency"
      summary     = "High API latency detected on {{ $labels.method }} {{ $labels.route }}"
    }
    
    labels = {
      severity = "warning"
      team     = "platform"
      service  = "visapi"
    }
    
    data {
      ref_id = "A"
      relative_time_range {
        from = 300
        to   = 0
      }
      datasource_uid = data.grafana_data_source.prometheus.uid
      model = jsonencode({
        expr = "histogram_quantile(0.95, sum(rate(visapi_http_request_duration_seconds_bucket[5m])) by (le, method, route)) * 1000 > ${var.alert_rules_config.api_latency_threshold_ms}"
        refId = "A"
      })
    }
    
    data {
      ref_id = "B"
      relative_time_range {
        from = 300
        to   = 0
      }
      datasource_uid = "__expr__"
      model = jsonencode({
        expression = "A"
        reducer    = "last"
        refId      = "B"
      })
    }
  }
}

# Error Rate Alert Rule
resource "grafana_rule_group" "error_rate" {
  name             = "visapi-error-rate"
  folder_uid       = grafana_folder.visapi_alerts.uid
  interval_seconds = 60
  
  rule {
    name           = "High Error Rate"
    condition      = "B"
    exec_err_state = "Alerting"
    no_data_state  = "NoData"
    for            = "5m"
    
    annotations = {
      description = "Error rate for {{ $labels.method }} {{ $labels.route }} is {{ $value }}% (threshold: ${var.alert_rules_config.error_rate_threshold}%)"
      runbook_url = "https://github.com/visanet/visapi/wiki/runbooks/high-error-rate"
      summary     = "High error rate detected on {{ $labels.method }} {{ $labels.route }}"
    }
    
    labels = {
      severity = "critical"
      team     = "platform"
      service  = "visapi"
    }
    
    data {
      ref_id = "A"
      relative_time_range {
        from = 300
        to   = 0
      }
      datasource_uid = data.grafana_data_source.prometheus.uid
      model = jsonencode({
        expr = "(sum(rate(visapi_http_requests_total{status=~\"5..\"}[5m])) by (method, route) / sum(rate(visapi_http_requests_total[5m])) by (method, route)) * 100 > ${var.alert_rules_config.error_rate_threshold}"
        refId = "A"
      })
    }
    
    data {
      ref_id = "B"
      relative_time_range {
        from = 300
        to   = 0
      }
      datasource_uid = "__expr__"
      model = jsonencode({
        expression = "A"
        reducer    = "last"
        refId      = "B"
      })
    }
  }
}

# Queue Depth Alert Rule
resource "grafana_rule_group" "queue_depth" {
  name             = "visapi-queue-depth"
  folder_uid       = grafana_folder.visapi_alerts.uid
  interval_seconds = 60
  
  rule {
    name           = "High Queue Depth"
    condition      = "B"
    exec_err_state = "Alerting"
    no_data_state  = "NoData"
    for            = "5m"
    
    annotations = {
      description = "Queue {{ $labels.queue_name }} (priority: {{ $labels.priority }}) has {{ $value }} pending jobs (threshold: ${var.alert_rules_config.queue_depth_threshold})"
      runbook_url = "https://github.com/visanet/visapi/wiki/runbooks/high-queue-depth"
      summary     = "High queue depth detected in {{ $labels.queue_name }}"
    }
    
    labels = {
      severity = "warning"
      team     = "platform"
      service  = "visapi"
    }
    
    data {
      ref_id = "A"
      relative_time_range {
        from = 300
        to   = 0
      }
      datasource_uid = data.grafana_data_source.prometheus.uid
      model = jsonencode({
        expr = "sum(visapi_queue_depth_total) by (queue_name, priority) > ${var.alert_rules_config.queue_depth_threshold}"
        refId = "A"
      })
    }
    
    data {
      ref_id = "B"
      relative_time_range {
        from = 300
        to   = 0
      }
      datasource_uid = "__expr__"
      model = jsonencode({
        expression = "A"
        reducer    = "last"
        refId      = "B"
      })
    }
  }
}

# Redis Connection Failures Alert Rule
resource "grafana_rule_group" "redis_failures" {
  name             = "visapi-redis-failures"
  folder_uid       = grafana_folder.visapi_alerts.uid
  interval_seconds = 60
  
  rule {
    name           = "Redis Connection Failures"
    condition      = "B"
    exec_err_state = "Alerting"
    no_data_state  = "NoData"
    for            = "1m"
    
    annotations = {
      description = "Redis operation {{ $labels.operation }} is failing with {{ $value }} errors in the last minute"
      runbook_url = "https://github.com/visanet/visapi/wiki/runbooks/redis-connection-failure"
      summary     = "Redis connection failures detected"
    }
    
    labels = {
      severity = "critical"
      team     = "platform"
      service  = "visapi"
    }
    
    data {
      ref_id = "A"
      relative_time_range {
        from = 300
        to   = 0
      }
      datasource_uid = data.grafana_data_source.prometheus.uid
      model = jsonencode({
        expr = "increase(visapi_redis_operations_total{status=\"error\"}[1m]) > 0"
        refId = "A"
      })
    }
    
    data {
      ref_id = "B"
      relative_time_range {
        from = 300
        to   = 0
      }
      datasource_uid = "__expr__"
      model = jsonencode({
        expression = "A"
        reducer    = "last"
        refId      = "B"
      })
    }
  }
}

# Contact Points
resource "grafana_contact_point" "slack_platform" {
  name = "slack-platform"
  
  slack {
    url     = var.slack_webhook_url
    channel = "#platform-alerts"
    title   = "VisAPI Alert"
    text    = <<-EOT
      {{ range .Alerts }}
        *Alert:* {{ .Annotations.summary }}
        *Severity:* {{ .Labels.severity }}
        *Description:* {{ .Annotations.description }}
        *Runbook:* {{ .Annotations.runbook_url }}
      {{ end }}
    EOT
  }
}

resource "grafana_contact_point" "slack_critical" {
  name = "slack-critical"
  
  slack {
    url     = var.slack_webhook_url
    channel = "#critical-alerts"
    title   = "🚨 CRITICAL: VisAPI Alert"
    text    = <<-EOT
      {{ range .Alerts }}
        *Alert:* {{ .Annotations.summary }}
        *Severity:* {{ .Labels.severity }}
        *Description:* {{ .Annotations.description }}
        *Runbook:* {{ .Annotations.runbook_url }}
      {{ end }}
    EOT
  }
}

resource "grafana_contact_point" "pagerduty" {
  count = var.pagerduty_integration_key != "" ? 1 : 0
  name  = "pagerduty"
  
  pagerduty {
    integration_key = var.pagerduty_integration_key
    severity        = "critical"
  }
}

# Notification Policy
resource "grafana_notification_policy" "visapi_policy" {
  group_by      = ["alertname", "cluster", "service"]
  contact_point = grafana_contact_point.slack_platform.name
  
  group_wait      = "30s"
  group_interval  = "5m"
  repeat_interval = "12h"
  
  policy {
    matcher {
      label = "severity"
      match = "="
      value = "critical"
    }
    contact_point = grafana_contact_point.slack_critical.name
    continue      = true
  }
  
  dynamic "policy" {
    for_each = var.pagerduty_integration_key != "" ? [1] : []
    content {
      matcher {
        label = "severity"
        match = "="
        value = "critical"
      }
      matcher {
        label = "alertname"
        match = "=~"
        value = "redis_connection_failures|error_rate_high"
      }
      contact_point = grafana_contact_point.pagerduty[0].name
    }
  }
}

# Mute Timing for Maintenance Windows
resource "grafana_mute_timing" "maintenance_window" {
  name = "maintenance-window"
  
  intervals {
    weekdays = ["sunday"]
    times {
      start_time = "02:00"
      end_time   = "04:00"
    }
    location = "America/New_York"
  }
}