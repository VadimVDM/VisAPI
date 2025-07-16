#!/bin/bash

# =============================================================================
# Recovery Monitor Script for Chaos Engineering
# =============================================================================
# This script monitors system recovery after chaos experiments
# and measures recovery time metrics
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHAOS_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${CHAOS_DIR}/logs/recovery-monitor-$(date +%Y%m%d-%H%M%S).log"
API_URL="${VISAPI_API_URL:-http://localhost:3000}"
API_KEY="${VISAPI_API_KEY:-}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
TIMEOUT=300  # 5 minutes timeout
CHECK_INTERVAL=5  # Check every 5 seconds
VERIFY_MODE=false

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%H:%M:%S')] ${message}${NC}" | tee -a "$LOG_FILE"
}

# Show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
  --timeout SECONDS      Maximum time to wait for recovery (default: 300)
  --interval SECONDS     Check interval (default: 5)
  --verify              Verify system health without waiting
  --api-url URL         VisAPI URL (default: http://localhost:3000)
  --api-key KEY         API key for authenticated endpoints
  --prometheus-url URL  Prometheus URL (default: http://localhost:9090)
  -h, --help            Show this help message

EXAMPLES:
  $0 --timeout 60
  $0 --verify
  $0 --api-url https://api.visanet.app --timeout 120

DESCRIPTION:
  This script monitors system recovery after chaos experiments by:
  - Checking API health endpoints
  - Validating queue processing
  - Verifying database connectivity
  - Monitoring service processes
  - Measuring recovery time metrics
EOF
}

# Check API health
check_api_health() {
    local start_time=$(date +%s)
    
    if curl -s -f "$API_URL/api/v1/healthz" -m 10 &> /dev/null; then
        local end_time=$(date +%s)
        local response_time=$((end_time - start_time))
        print_status "$GREEN" "API Health: OK (${response_time}s)"
        return 0
    else
        print_status "$RED" "API Health: FAILED"
        return 1
    fi
}

# Check queue processing
check_queue_processing() {
    local headers=""
    if [[ -n "$API_KEY" ]]; then
        headers="-H X-API-Key:$API_KEY"
    fi
    
    local start_time=$(date +%s)
    
    if curl -s -f $headers "$API_URL/api/v1/queue/metrics" -m 10 &> /dev/null; then
        local end_time=$(date +%s)
        local response_time=$((end_time - start_time))
        
        # Get queue metrics
        local queue_metrics=$(curl -s $headers "$API_URL/api/v1/queue/metrics" -m 10 | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
        
        print_status "$GREEN" "Queue Processing: OK (${response_time}s, status: $queue_metrics)"
        return 0
    else
        print_status "$RED" "Queue Processing: FAILED"
        return 1
    fi
}

# Check database connectivity
check_database_connectivity() {
    local start_time=$(date +%s)
    
    # Try to access a database-dependent endpoint
    if curl -s -f "$API_URL/api/v1/workflows" -H "X-API-Key:$API_KEY" -m 10 &> /dev/null; then
        local end_time=$(date +%s)
        local response_time=$((end_time - start_time))
        print_status "$GREEN" "Database Connectivity: OK (${response_time}s)"
        return 0
    else
        print_status "$RED" "Database Connectivity: FAILED"
        return 1
    fi
}

# Check Redis connectivity
check_redis_connectivity() {
    local start_time=$(date +%s)
    
    # Check if Redis is accessible (try to connect)
    if command -v redis-cli &> /dev/null; then
        local redis_host="${REDIS_HOST:-localhost}"
        local redis_port="${REDIS_PORT:-6379}"
        
        if redis-cli -h "$redis_host" -p "$redis_port" ping &> /dev/null; then
            local end_time=$(date +%s)
            local response_time=$((end_time - start_time))
            print_status "$GREEN" "Redis Connectivity: OK (${response_time}s)"
            return 0
        else
            print_status "$RED" "Redis Connectivity: FAILED"
            return 1
        fi
    else
        print_status "$YELLOW" "Redis Connectivity: SKIPPED (redis-cli not available)"
        return 0
    fi
}

# Check service processes
check_service_processes() {
    local backend_count=$(pgrep -f "main.js" | wc -l)
    local worker_count=$(pgrep -f "worker" | wc -l)
    local node_count=$(pgrep -f "node" | wc -l)
    
    print_status "$BLUE" "Service Processes: Backend=$backend_count, Worker=$worker_count, Node=$node_count"
    
    if [[ $backend_count -gt 0 && $worker_count -gt 0 ]]; then
        print_status "$GREEN" "Service Processes: OK"
        return 0
    else
        print_status "$RED" "Service Processes: INCOMPLETE"
        return 1
    fi
}

# Check Prometheus metrics
check_prometheus_metrics() {
    local start_time=$(date +%s)
    
    if curl -s -f "$PROMETHEUS_URL/api/v1/query?query=up" -m 10 &> /dev/null; then
        local end_time=$(date +%s)
        local response_time=$((end_time - start_time))
        
        # Get service status from Prometheus
        local up_services=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=up" -m 10 | jq -r '.data.result | length' 2>/dev/null || echo "0")
        
        print_status "$GREEN" "Prometheus Metrics: OK (${response_time}s, $up_services services up)"
        return 0
    else
        print_status "$RED" "Prometheus Metrics: FAILED"
        return 1
    fi
}

# Test critical workflows
test_critical_workflows() {
    local headers=""
    if [[ -n "$API_KEY" ]]; then
        headers="-H X-API-Key:$API_KEY"
    fi
    
    print_status "$BLUE" "Testing critical workflows..."
    
    # Test webhook trigger
    local webhook_response=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
        $headers \
        -H "Content-Type: application/json" \
        -d '{"test": "recovery-test", "timestamp": "'$(date -Iseconds)'"}' \
        "$API_URL/api/v1/triggers/test-webhook" -m 10)
    
    if [[ "$webhook_response" == "200" || "$webhook_response" == "202" ]]; then
        print_status "$GREEN" "Webhook Trigger: OK ($webhook_response)"
    else
        print_status "$RED" "Webhook Trigger: FAILED ($webhook_response)"
        return 1
    fi
    
    # Test queue job submission
    local queue_response=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
        $headers \
        -H "Content-Type: application/json" \
        -d '{"message": "recovery-test", "priority": "default"}' \
        "$API_URL/api/v1/admin/queue/add" -m 10)
    
    if [[ "$queue_response" == "200" || "$queue_response" == "202" ]]; then
        print_status "$GREEN" "Queue Job Submission: OK ($queue_response)"
    else
        print_status "$YELLOW" "Queue Job Submission: FAILED ($queue_response)"
        # Not critical for recovery validation
    fi
    
    return 0
}

# Measure system performance
measure_system_performance() {
    print_status "$BLUE" "Measuring system performance..."
    
    # API response time
    local api_start=$(date +%s%N)
    curl -s -f "$API_URL/api/v1/healthz" -m 10 &> /dev/null
    local api_end=$(date +%s%N)
    local api_response_time=$(( (api_end - api_start) / 1000000 ))  # Convert to milliseconds
    
    # Queue response time
    local queue_start=$(date +%s%N)
    curl -s -f -H "X-API-Key:$API_KEY" "$API_URL/api/v1/queue/metrics" -m 10 &> /dev/null
    local queue_end=$(date +%s%N)
    local queue_response_time=$(( (queue_end - queue_start) / 1000000 ))
    
    # System resource usage
    local memory_usage=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2 }')
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    print_status "$BLUE" "Performance Metrics:"
    print_status "$BLUE" "  API Response Time: ${api_response_time}ms"
    print_status "$BLUE" "  Queue Response Time: ${queue_response_time}ms"
    print_status "$BLUE" "  Memory Usage: ${memory_usage}%"
    print_status "$BLUE" "  CPU Usage: ${cpu_usage}%"
    print_status "$BLUE" "  Load Average: $load_avg"
    
    # Performance thresholds
    local performance_ok=true
    
    if [[ $api_response_time -gt 2000 ]]; then
        print_status "$YELLOW" "  WARNING: API response time is high (${api_response_time}ms > 2000ms)"
        performance_ok=false
    fi
    
    if [[ $queue_response_time -gt 1000 ]]; then
        print_status "$YELLOW" "  WARNING: Queue response time is high (${queue_response_time}ms > 1000ms)"
        performance_ok=false
    fi
    
    if [[ $(echo "$memory_usage > 80" | bc -l) -eq 1 ]]; then
        print_status "$YELLOW" "  WARNING: Memory usage is high (${memory_usage}% > 80%)"
        performance_ok=false
    fi
    
    if [[ $(echo "$cpu_usage > 80" | bc -l) -eq 1 ]]; then
        print_status "$YELLOW" "  WARNING: CPU usage is high (${cpu_usage}% > 80%)"
        performance_ok=false
    fi
    
    if [[ "$performance_ok" == "true" ]]; then
        print_status "$GREEN" "System Performance: OK"
        return 0
    else
        print_status "$YELLOW" "System Performance: DEGRADED"
        return 1
    fi
}

# Comprehensive system health check
verify_system_health() {
    print_status "$BLUE" "Verifying system health..."
    
    local checks_passed=0
    local total_checks=0
    
    # API Health Check
    ((total_checks++))
    if check_api_health; then
        ((checks_passed++))
    fi
    
    # Queue Processing Check
    ((total_checks++))
    if check_queue_processing; then
        ((checks_passed++))
    fi
    
    # Database Connectivity Check
    ((total_checks++))
    if check_database_connectivity; then
        ((checks_passed++))
    fi
    
    # Redis Connectivity Check
    ((total_checks++))
    if check_redis_connectivity; then
        ((checks_passed++))
    fi
    
    # Service Processes Check
    ((total_checks++))
    if check_service_processes; then
        ((checks_passed++))
    fi
    
    # Prometheus Metrics Check
    ((total_checks++))
    if check_prometheus_metrics; then
        ((checks_passed++))
    fi
    
    # Critical Workflows Test
    ((total_checks++))
    if test_critical_workflows; then
        ((checks_passed++))
    fi
    
    # System Performance Check
    ((total_checks++))
    if measure_system_performance; then
        ((checks_passed++))
    fi
    
    # Calculate health score
    local health_score=$(( (checks_passed * 100) / total_checks ))
    
    print_status "$BLUE" "Health Check Results: $checks_passed/$total_checks passed (${health_score}%)"
    
    if [[ $health_score -ge 80 ]]; then
        print_status "$GREEN" "System Health: HEALTHY"
        return 0
    elif [[ $health_score -ge 60 ]]; then
        print_status "$YELLOW" "System Health: DEGRADED"
        return 1
    else
        print_status "$RED" "System Health: CRITICAL"
        return 2
    fi
}

# Monitor recovery
monitor_recovery() {
    print_status "$BLUE" "Starting recovery monitoring..."
    print_status "$BLUE" "Timeout: ${TIMEOUT}s | Check Interval: ${CHECK_INTERVAL}s"
    
    local start_time=$(date +%s)
    local checks_count=0
    local recovery_time=0
    local system_healthy=false
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        ((checks_count++))
        print_status "$BLUE" "Recovery Check #$checks_count (elapsed: ${elapsed}s)"
        
        # Check if system is healthy
        if verify_system_health; then
            recovery_time=$elapsed
            system_healthy=true
            break
        fi
        
        # Check timeout
        if [[ $elapsed -ge $TIMEOUT ]]; then
            print_status "$RED" "Recovery monitoring timed out after ${TIMEOUT}s"
            break
        fi
        
        # Wait before next check
        sleep $CHECK_INTERVAL
    done
    
    # Generate recovery report
    generate_recovery_report "$start_time" "$recovery_time" "$checks_count" "$system_healthy"
    
    if [[ "$system_healthy" == "true" ]]; then
        print_status "$GREEN" "System recovery completed in ${recovery_time}s"
        return 0
    else
        print_status "$RED" "System recovery failed or incomplete"
        return 1
    fi
}

# Generate recovery report
generate_recovery_report() {
    local start_time=$1
    local recovery_time=$2
    local checks_count=$3
    local system_healthy=$4
    
    local report_file="${CHAOS_DIR}/reports/recovery-report-$(date +%Y%m%d-%H%M%S).json"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
{
  "recovery_monitoring": {
    "start_time": "$(date -d "@$start_time" -Iseconds)",
    "end_time": "$(date -Iseconds)",
    "recovery_time_seconds": $recovery_time,
    "total_checks": $checks_count,
    "system_healthy": $system_healthy,
    "timeout_seconds": $TIMEOUT,
    "check_interval_seconds": $CHECK_INTERVAL
  },
  "configuration": {
    "api_url": "$API_URL",
    "prometheus_url": "$PROMETHEUS_URL",
    "timeout": $TIMEOUT,
    "check_interval": $CHECK_INTERVAL
  },
  "log_file": "$LOG_FILE"
}
EOF
    
    print_status "$GREEN" "Recovery report generated: $report_file"
}

# Main execution
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --interval)
                CHECK_INTERVAL="$2"
                shift 2
                ;;
            --verify)
                VERIFY_MODE=true
                shift
                ;;
            --api-url)
                API_URL="$2"
                shift 2
                ;;
            --api-key)
                API_KEY="$2"
                shift 2
                ;;
            --prometheus-url)
                PROMETHEUS_URL="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_status "$RED" "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    print_status "$BLUE" "Recovery Monitor started"
    print_status "$BLUE" "API URL: $API_URL"
    print_status "$BLUE" "Prometheus URL: $PROMETHEUS_URL"
    print_status "$BLUE" "Verify Mode: $VERIFY_MODE"
    
    if [[ "$VERIFY_MODE" == "true" ]]; then
        # Just verify system health once
        verify_system_health
        exit $?
    else
        # Monitor recovery
        monitor_recovery
        exit $?
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi