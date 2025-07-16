output "folder_uid" {
  description = "UID of the Grafana folder containing alert rules"
  value       = grafana_folder.visapi_alerts.uid
}

output "contact_points" {
  description = "Contact points created for notifications"
  value = {
    slack_platform = grafana_contact_point.slack_platform.name
    slack_critical = grafana_contact_point.slack_critical.name
    pagerduty      = var.pagerduty_integration_key != "" ? grafana_contact_point.pagerduty[0].name : null
  }
}

output "alert_rules" {
  description = "Alert rules created"
  value = {
    api_latency    = grafana_rule_group.api_latency.name
    error_rate     = grafana_rule_group.error_rate.name
    queue_depth    = grafana_rule_group.queue_depth.name
    redis_failures = grafana_rule_group.redis_failures.name
  }
}

output "notification_policy" {
  description = "Notification policy configuration"
  value = {
    name          = grafana_notification_policy.visapi_policy.contact_point
    group_by      = grafana_notification_policy.visapi_policy.group_by
    group_wait    = grafana_notification_policy.visapi_policy.group_wait
    repeat_interval = grafana_notification_policy.visapi_policy.repeat_interval
  }
}

output "mute_timing" {
  description = "Maintenance window mute timing"
  value = {
    name = grafana_mute_timing.maintenance_window.name
  }
}