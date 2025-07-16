#!/bin/bash

# Network Partition Chaos Script
# Simulates Upstash Redis unreachable by blocking Redis connections
# Usage: ./network-partition.sh [duration_minutes] [redis_host]

set -euo pipefail

# Configuration
DURATION_MINUTES="${1:-5}"
REDIS_HOST="${2:-redis-10000.c1.us-east-1-2.ec2.redns.redis-cloud.com}"
REDIS_PORT="10000"
LOG_FILE="/tmp/network-partition-chaos.log"
METRICS_FILE="/tmp/network-partition-metrics.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running as root (needed for iptables)
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root for iptables manipulation"
        echo "Please run: sudo $0 $@"
        exit 1
    fi
}

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."
    
    # Check if iptables is available
    if ! command -v iptables &> /dev/null; then
        error "iptables is not available. Please install iptables."
        exit 1
    fi
    
    # Check if Redis is reachable before chaos
    if ! nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
        warn "Redis at $REDIS_HOST:$REDIS_PORT is not reachable. Continuing anyway..."
    else
        log "Redis connectivity verified before chaos"
    fi
    
    # Check if backend service is running
    if ! pgrep -f "main.js" > /dev/null; then
        warn "Backend service doesn't appear to be running"
    fi
}

# Block Redis connections using iptables
block_redis() {
    log "Blocking Redis connections to $REDIS_HOST:$REDIS_PORT"
    
    # Block outgoing connections to Redis
    iptables -A OUTPUT -p tcp --dport "$REDIS_PORT" -d "$REDIS_HOST" -j DROP
    
    # Also block by IP if host resolves
    REDIS_IP=$(dig +short "$REDIS_HOST" | head -n1)
    if [[ -n "$REDIS_IP" ]]; then
        iptables -A OUTPUT -p tcp --dport "$REDIS_PORT" -d "$REDIS_IP" -j DROP
        log "Blocked Redis IP: $REDIS_IP"
    fi
    
    log "Redis connections blocked"
}

# Restore Redis connections
restore_redis() {
    log "Restoring Redis connections..."
    
    # Remove the blocking rules
    iptables -D OUTPUT -p tcp --dport "$REDIS_PORT" -d "$REDIS_HOST" -j DROP 2>/dev/null || true
    
    # Remove IP-based rules
    REDIS_IP=$(dig +short "$REDIS_HOST" | head -n1)
    if [[ -n "$REDIS_IP" ]]; then
        iptables -D OUTPUT -p tcp --dport "$REDIS_PORT" -d "$REDIS_IP" -j DROP 2>/dev/null || true
    fi
    
    log "Redis connections restored"
}

# Monitor system behavior during chaos
monitor_system() {
    local duration=$1
    local start_time=$(date +%s)
    local end_time=$((start_time + duration * 60))
    
    log "Starting system monitoring for $duration minutes..."
    
    # Initialize metrics
    cat > "$METRICS_FILE" << EOF
{
    "experiment": "network-partition",
    "start_time": "$start_time",
    "duration_minutes": $duration,
    "redis_host": "$REDIS_HOST",
    "metrics": []
}
EOF
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        # Check Redis connectivity
        local redis_status="unreachable"
        if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
            redis_status="reachable"
        fi
        
        # Check backend health
        local backend_status="unknown"
        local response_time="null"
        if curl -s -w "%{http_code}" -o /dev/null "http://localhost:3000/api/v1/healthz" | grep -q "200"; then
            backend_status="healthy"
            response_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:3000/api/v1/healthz" || echo "null")
        else
            backend_status="unhealthy"
        fi
        
        # Check queue metrics
        local queue_depth="null"
        local queue_status="unknown"
        if curl -s "http://localhost:3000/api/v1/queue/metrics" | jq -e '.waiting' &>/dev/null; then
            queue_depth=$(curl -s "http://localhost:3000/api/v1/queue/metrics" | jq -r '.waiting' || echo "null")
            queue_status="accessible"
        else
            queue_status="inaccessible"
        fi
        
        # Check process count
        local process_count=$(pgrep -f "main.js" | wc -l)
        
        # Record metrics
        local metric_entry=$(cat << EOF
{
    "timestamp": $current_time,
    "elapsed_seconds": $elapsed,
    "redis_status": "$redis_status",
    "backend_status": "$backend_status",
    "backend_response_time": $response_time,
    "queue_status": "$queue_status",
    "queue_depth": $queue_depth,
    "process_count": $process_count
}
EOF
)
        
        # Append to metrics file
        jq --argjson metric "$metric_entry" '.metrics += [$metric]' "$METRICS_FILE" > "${METRICS_FILE}.tmp" && mv "${METRICS_FILE}.tmp" "$METRICS_FILE"
        
        log "Monitoring: Redis=$redis_status, Backend=$backend_status, Queue=$queue_status (depth=$queue_depth)"
        
        sleep 10
    done
    
    # Finalize metrics
    jq --arg end_time "$(date +%s)" '.end_time = $end_time' "$METRICS_FILE" > "${METRICS_FILE}.tmp" && mv "${METRICS_FILE}.tmp" "$METRICS_FILE"
    
    log "System monitoring completed"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    restore_redis
    log "Cleanup completed"
}

# Signal handlers
trap cleanup EXIT
trap cleanup SIGINT
trap cleanup SIGTERM

# Main execution
main() {
    log "Starting Network Partition Chaos Experiment"
    log "Duration: $DURATION_MINUTES minutes"
    log "Redis Host: $REDIS_HOST:$REDIS_PORT"
    log "Log file: $LOG_FILE"
    log "Metrics file: $METRICS_FILE"
    
    check_root
    preflight_checks
    
    # Start monitoring in background
    monitor_system "$DURATION_MINUTES" &
    MONITOR_PID=$!
    
    # Block Redis connections
    block_redis
    
    log "Chaos experiment is running. Redis connections are blocked."
    log "Press Ctrl+C to stop the experiment early."
    
    # Wait for the duration
    sleep $((DURATION_MINUTES * 60))
    
    # Stop monitoring
    kill $MONITOR_PID 2>/dev/null || true
    wait $MONITOR_PID 2>/dev/null || true
    
    log "Network Partition Chaos Experiment completed"
    log "Metrics saved to: $METRICS_FILE"
    log "Logs saved to: $LOG_FILE"
    
    # Display summary
    echo
    echo "=== EXPERIMENT SUMMARY ==="
    echo "Duration: $DURATION_MINUTES minutes"
    echo "Redis Host: $REDIS_HOST:$REDIS_PORT"
    echo "Metrics: $METRICS_FILE"
    echo "Logs: $LOG_FILE"
    echo
    
    # Show final metrics
    if [[ -f "$METRICS_FILE" ]]; then
        echo "Final metrics:"
        jq -r '.metrics[-1] | "Redis: \(.redis_status), Backend: \(.backend_status), Queue: \(.queue_status)"' "$METRICS_FILE"
    fi
}

# Help function
show_help() {
    cat << EOF
Network Partition Chaos Script

Usage: $0 [duration_minutes] [redis_host]

Arguments:
    duration_minutes    Duration to block Redis connections (default: 5)
    redis_host          Redis hostname (default: redis-10000.c1.us-east-1-2.ec2.redns.redis-cloud.com)

Examples:
    $0                  # Run for 5 minutes with default Redis host
    $0 10               # Run for 10 minutes
    $0 5 localhost      # Run for 5 minutes against localhost Redis

This script simulates network partition by blocking Redis connections and monitors
system behavior during the outage.

Requirements:
- Must be run as root (for iptables)
- iptables must be installed
- Backend service should be running on localhost:3000
- jq and curl must be installed

EOF
}

# Check for help flag
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

# Run main function
main "$@"