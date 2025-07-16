#!/bin/bash

# Service Failure Chaos Script
# Simulates random service crashes and tests process restart mechanisms
# Usage: ./service-failure.sh [duration_minutes] [failure_interval_seconds]

set -euo pipefail

# Configuration
DURATION_MINUTES="${1:-10}"
FAILURE_INTERVAL="${2:-60}"
LOG_FILE="/tmp/service-failure-chaos.log"
METRICS_FILE="/tmp/service-failure-metrics.json"
BACKEND_PROCESS_NAME="main.js"
WORKER_PROCESS_NAME="worker"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."
    
    # Check if required tools are available
    for tool in pgrep pkill curl jq; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is not available. Please install it."
            exit 1
        fi
    done
    
    # Check if backend service is running
    if ! pgrep -f "$BACKEND_PROCESS_NAME" > /dev/null; then
        warn "Backend service doesn't appear to be running"
    else
        log "Backend service is running"
    fi
    
    # Check if we can reach the health endpoint
    if curl -s -f "http://localhost:3000/api/v1/healthz" > /dev/null; then
        log "Health endpoint is accessible"
    else
        warn "Health endpoint is not accessible"
    fi
}

# Get process information
get_process_info() {
    local process_name="$1"
    local pids=$(pgrep -f "$process_name" | head -5)  # Limit to 5 processes
    
    if [[ -z "$pids" ]]; then
        echo "[]"
        return
    fi
    
    local info_array="["
    local first=true
    
    for pid in $pids; do
        if [[ "$first" == "true" ]]; then
            first=false
        else
            info_array+=","
        fi
        
        local cmd=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
        local start_time=$(ps -p "$pid" -o lstart= 2>/dev/null || echo "unknown")
        local cpu_usage=$(ps -p "$pid" -o pcpu= 2>/dev/null || echo "0")
        local mem_usage=$(ps -p "$pid" -o pmem= 2>/dev/null || echo "0")
        
        info_array+="{\"pid\":$pid,\"cmd\":\"$cmd\",\"start_time\":\"$start_time\",\"cpu_usage\":$cpu_usage,\"mem_usage\":$mem_usage}"
    done
    
    info_array+="]"
    echo "$info_array"
}

# Kill a random process
kill_random_process() {
    local process_name="$1"
    local signal="${2:-TERM}"
    
    local pids=$(pgrep -f "$process_name")
    if [[ -z "$pids" ]]; then
        warn "No processes found matching '$process_name'"
        return 1
    fi
    
    # Convert to array and pick random
    local pid_array=($pids)
    local random_index=$((RANDOM % ${#pid_array[@]}))
    local target_pid=${pid_array[$random_index]}
    
    log "Killing process $target_pid with signal $signal"
    
    if kill -"$signal" "$target_pid" 2>/dev/null; then
        log "Successfully sent $signal to process $target_pid"
        return 0
    else
        error "Failed to kill process $target_pid"
        return 1
    fi
}

# Simulate different failure scenarios
simulate_failures() {
    local scenarios=("graceful_shutdown" "force_kill" "segfault" "random_worker")
    local scenario=${scenarios[$((RANDOM % ${#scenarios[@]}))]}
    
    case "$scenario" in
        "graceful_shutdown")
            log "Simulating graceful shutdown (SIGTERM)"
            kill_random_process "$BACKEND_PROCESS_NAME" "TERM"
            ;;
        "force_kill")
            log "Simulating force kill (SIGKILL)"
            kill_random_process "$BACKEND_PROCESS_NAME" "KILL"
            ;;
        "segfault")
            log "Simulating segmentation fault (SIGSEGV)"
            kill_random_process "$BACKEND_PROCESS_NAME" "SEGV"
            ;;
        "random_worker")
            log "Simulating worker process failure"
            if pgrep -f "$WORKER_PROCESS_NAME" > /dev/null; then
                kill_random_process "$WORKER_PROCESS_NAME" "KILL"
            else
                warn "No worker processes found, killing main process instead"
                kill_random_process "$BACKEND_PROCESS_NAME" "TERM"
            fi
            ;;
    esac
    
    echo "$scenario"
}

# Check service recovery
check_recovery() {
    local max_wait_time=30
    local check_interval=2
    local elapsed=0
    
    log "Checking service recovery..."
    
    while [[ $elapsed -lt $max_wait_time ]]; do
        if pgrep -f "$BACKEND_PROCESS_NAME" > /dev/null; then
            if curl -s -f "http://localhost:3000/api/v1/healthz" > /dev/null; then
                log "Service recovered successfully in ${elapsed}s"
                return $elapsed
            fi
        fi
        
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
    done
    
    error "Service failed to recover within ${max_wait_time}s"
    return -1
}

# Monitor system during chaos
monitor_system() {
    local duration=$1
    local start_time=$(date +%s)
    local end_time=$((start_time + duration * 60))
    local failure_count=0
    
    log "Starting system monitoring for $duration minutes..."
    
    # Initialize metrics
    cat > "$METRICS_FILE" << EOF
{
    "experiment": "service-failure",
    "start_time": "$start_time",
    "duration_minutes": $duration,
    "failure_interval_seconds": $FAILURE_INTERVAL,
    "metrics": [],
    "failures": []
}
EOF
    
    local last_failure_time=0
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        # Check if it's time for a failure
        if [[ $((current_time - last_failure_time)) -ge $FAILURE_INTERVAL ]]; then
            log "Triggering failure #$((failure_count + 1))"
            
            # Record pre-failure state
            local pre_failure_processes=$(get_process_info "$BACKEND_PROCESS_NAME")
            
            # Simulate failure
            local failure_scenario=$(simulate_failures)
            local failure_time=$(date +%s)
            
            # Wait a moment for the failure to take effect
            sleep 2
            
            # Check recovery
            local recovery_time=$(check_recovery)
            local recovery_success="true"
            if [[ $recovery_time -eq -1 ]]; then
                recovery_success="false"
                recovery_time="null"
            fi
            
            # Record post-failure state
            local post_failure_processes=$(get_process_info "$BACKEND_PROCESS_NAME")
            
            # Record failure event
            local failure_event=$(cat << EOF
{
    "failure_number": $((failure_count + 1)),
    "timestamp": $failure_time,
    "scenario": "$failure_scenario",
    "pre_failure_processes": $pre_failure_processes,
    "post_failure_processes": $post_failure_processes,
    "recovery_time_seconds": $recovery_time,
    "recovery_success": $recovery_success
}
EOF
)
            
            # Append to metrics file
            jq --argjson failure "$failure_event" '.failures += [$failure]' "$METRICS_FILE" > "${METRICS_FILE}.tmp" && mv "${METRICS_FILE}.tmp" "$METRICS_FILE"
            
            failure_count=$((failure_count + 1))
            last_failure_time=$current_time
        fi
        
        # Collect general metrics
        local process_count=$(pgrep -f "$BACKEND_PROCESS_NAME" | wc -l)
        local worker_count=$(pgrep -f "$WORKER_PROCESS_NAME" | wc -l)
        
        # Check service health
        local service_status="unknown"
        local response_time="null"
        if curl -s -w "%{http_code}" -o /dev/null "http://localhost:3000/api/v1/healthz" | grep -q "200"; then
            service_status="healthy"
            response_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:3000/api/v1/healthz" || echo "null")
        else
            service_status="unhealthy"
        fi
        
        # Check queue metrics
        local queue_depth="null"
        local active_jobs="null"
        if curl -s "http://localhost:3000/api/v1/queue/metrics" | jq -e '.waiting' &>/dev/null; then
            queue_depth=$(curl -s "http://localhost:3000/api/v1/queue/metrics" | jq -r '.waiting' || echo "null")
            active_jobs=$(curl -s "http://localhost:3000/api/v1/queue/metrics" | jq -r '.active' || echo "null")
        fi
        
        # Record metrics
        local metric_entry=$(cat << EOF
{
    "timestamp": $current_time,
    "elapsed_seconds": $elapsed,
    "service_status": "$service_status",
    "response_time": $response_time,
    "process_count": $process_count,
    "worker_count": $worker_count,
    "queue_depth": $queue_depth,
    "active_jobs": $active_jobs,
    "total_failures": $failure_count
}
EOF
)
        
        # Append to metrics file
        jq --argjson metric "$metric_entry" '.metrics += [$metric]' "$METRICS_FILE" > "${METRICS_FILE}.tmp" && mv "${METRICS_FILE}.tmp" "$METRICS_FILE"
        
        info "Status: Service=$service_status, Processes=$process_count, Workers=$worker_count, Failures=$failure_count"
        
        sleep 5
    done
    
    # Finalize metrics
    jq --arg end_time "$(date +%s)" '.end_time = $end_time' "$METRICS_FILE" > "${METRICS_FILE}.tmp" && mv "${METRICS_FILE}.tmp" "$METRICS_FILE"
    
    log "System monitoring completed. Total failures: $failure_count"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    # Kill any monitoring processes
    jobs -p | xargs -r kill 2>/dev/null || true
    log "Cleanup completed"
}

# Signal handlers
trap cleanup EXIT
trap cleanup SIGINT
trap cleanup SIGTERM

# Main execution
main() {
    log "Starting Service Failure Chaos Experiment"
    log "Duration: $DURATION_MINUTES minutes"
    log "Failure Interval: $FAILURE_INTERVAL seconds"
    log "Target Process: $BACKEND_PROCESS_NAME"
    log "Log file: $LOG_FILE"
    log "Metrics file: $METRICS_FILE"
    
    preflight_checks
    
    # Start monitoring
    monitor_system "$DURATION_MINUTES"
    
    log "Service Failure Chaos Experiment completed"
    log "Metrics saved to: $METRICS_FILE"
    log "Logs saved to: $LOG_FILE"
    
    # Display summary
    echo
    echo "=== EXPERIMENT SUMMARY ==="
    echo "Duration: $DURATION_MINUTES minutes"
    echo "Failure Interval: $FAILURE_INTERVAL seconds"
    echo "Metrics: $METRICS_FILE"
    echo "Logs: $LOG_FILE"
    echo
    
    # Show final metrics
    if [[ -f "$METRICS_FILE" ]]; then
        echo "Final metrics:"
        local total_failures=$(jq -r '.failures | length' "$METRICS_FILE")
        local successful_recoveries=$(jq -r '.failures | map(select(.recovery_success == true)) | length' "$METRICS_FILE")
        local avg_recovery_time=$(jq -r '.failures | map(select(.recovery_time_seconds != null)) | map(.recovery_time_seconds) | add / length' "$METRICS_FILE")
        
        echo "Total failures: $total_failures"
        echo "Successful recoveries: $successful_recoveries"
        echo "Average recovery time: ${avg_recovery_time}s"
        
        jq -r '.metrics[-1] | "Final status: Service=\(.service_status), Processes=\(.process_count), Workers=\(.worker_count)"' "$METRICS_FILE"
    fi
}

# Help function
show_help() {
    cat << EOF
Service Failure Chaos Script

Usage: $0 [duration_minutes] [failure_interval_seconds]

Arguments:
    duration_minutes        Duration to run chaos experiment (default: 10)
    failure_interval_seconds    Seconds between failures (default: 60)

Examples:
    $0                      # Run for 10 minutes with 60s intervals
    $0 5 30                 # Run for 5 minutes with 30s intervals
    $0 20 120               # Run for 20 minutes with 2m intervals

This script simulates various service failure scenarios:
- Graceful shutdown (SIGTERM)
- Force kill (SIGKILL)
- Segmentation fault (SIGSEGV)
- Worker process failures

The script monitors service recovery and collects metrics on:
- Recovery time
- Process counts
- Service health
- Queue status

Requirements:
- Backend service should be running
- pgrep, pkill, curl, jq must be installed
- Health endpoint should be accessible at localhost:3000/api/v1/healthz

EOF
}

# Check for help flag
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

# Run main function
main "$@"