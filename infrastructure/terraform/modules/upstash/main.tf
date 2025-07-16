terraform {
  required_providers {
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.5.0"
    }
  }
}

resource "upstash_redis_database" "main" {
  database_name = var.redis_config.name
  region        = var.region
  tls           = var.redis_config.tls
  eviction      = var.redis_config.eviction
  
  # Persistence configuration
  persistence = var.redis_config.persistence
  
  # Performance settings
  consistent    = true
  multi_zone    = var.environment == "production" ? true : false
  
  lifecycle {
    prevent_destroy = true
  }
}

# Create read replicas for production
resource "upstash_redis_database" "replica" {
  count = var.environment == "production" ? 1 : 0
  
  database_name = "${var.redis_config.name}-replica"
  region        = var.region == "us-east-1" ? "us-west-2" : "eu-west-1"
  primary_db    = upstash_redis_database.main.database_id
}

# Outputs
output "redis_database_id" {
  value = upstash_redis_database.main.database_id
}

output "redis_endpoint" {
  value = upstash_redis_database.main.endpoint
}

output "redis_host" {
  value = split(":", upstash_redis_database.main.endpoint)[0]
}

output "redis_port" {
  value = split(":", upstash_redis_database.main.endpoint)[1]
}

output "redis_password" {
  value     = upstash_redis_database.main.password
  sensitive = true
}

output "redis_url" {
  value     = "redis://default:${upstash_redis_database.main.password}@${upstash_redis_database.main.endpoint}"
  sensitive = true
}

output "redis_tls_url" {
  value     = "rediss://default:${upstash_redis_database.main.password}@${upstash_redis_database.main.endpoint}"
  sensitive = true
}