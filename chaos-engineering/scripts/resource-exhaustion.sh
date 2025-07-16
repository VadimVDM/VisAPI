#!/bin/bash

# Resource Exhaustion Chaos Script
# Simulates memory/CPU limits and tests system behavior under resource pressure
# Usage: ./resource-exhaustion.sh [duration_minutes] [resource_type] [intensity]

set -euo pipefail

# Configuration
DURATION_MINUTES="${1:-10}"
RESOURCE_TYPE="${2:-memory}"  # memory, cpu, disk, or mixed
INTENSITY="${3:-medium}"      # low, medium, high
LOG_FILE="/tmp/resource-exhaustion-chaos.log"
METRICS_FILE="/tmp/resource-exhaustion-metrics.json"
STRESS_PIDS=()

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

# Get system resource configuration
get_system_resources() {
    local cpu_cores=$(nproc)
    local total_memory=$(free -m | awk 'NR==2{print $2}')
    local available_memory=$(free -m | awk 'NR==2{print $7}')
    local disk_space=$(df -m / | awk 'NR==2{print $4}')
    
    echo "{\"cpu_cores\":$cpu_cores,\"total_memory_mb\":$total_memory,\"available_memory_mb\":$available_memory,\"disk_space_mb\":$disk_space}"
}

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."
    
    # Check if required tools are available
    for tool in stress-ng free df nproc curl jq; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is not available. Please install it."
            if [[ "$tool" == "stress-ng" ]]; then
                error "Install with: sudo apt-get install stress-ng  # Ubuntu/Debian"
                error "            or: sudo yum install stress-ng     # CentOS/RHEL"
                error "            or: brew install stress-ng         # macOS"
            fi
            exit 1
        fi
    done
    
    # Get system resources
    local system_resources=$(get_system_resources)
    log "System resources: $system_resources"
    
    # Check if backend service is running
    if ! pgrep -f "main.js" > /dev/null; then
        warn "Backend service doesn't appear to be running"
    else
        log "Backend service is running"
    fi
    
    # Check available resources
    local available_memory=$(echo "$system_resources" | jq -r '.available_memory_mb')
    if [[ "$available_memory" -lt 500 ]]; then
        warn "Low available memory: ${available_memory}MB"
    fi
}

# Calculate stress parameters based on intensity
calculate_stress_params() {
    local resource_type="$1"
    local intensity="$2"
    local system_resources=$(get_system_resources)
    
    local cpu_cores=$(echo "$system_resources" | jq -r '.cpu_cores')
    local total_memory=$(echo "$system_resources" | jq -r '.total_memory_mb')
    
    case "$intensity" in
        "low")
            local cpu_workers=$((cpu_cores / 2))
            local memory_workers=1
            local memory_size=$((total_memory / 8))
            local disk_workers=1
            local disk_size="100M"
            ;;
        "medium")
            local cpu_workers=$cpu_cores
            local memory_workers=2
            local memory_size=$((total_memory / 4))
            local disk_workers=2
            local disk_size="500M"
            ;;
        "high")
            local cpu_workers=$((cpu_cores * 2))
            local memory_workers=4
            local memory_size=$((total_memory / 2))
            local disk_workers=4
            local disk_size="1G"
            ;;
        *)
            error "Invalid intensity: $intensity. Use low, medium, or high"
            exit 1
            ;;
    esac
    
    echo "{\"cpu_workers\":$cpu_workers,\"memory_workers\":$memory_workers,\"memory_size_mb\":$memory_size,\"disk_workers\":$disk_workers,\"disk_size\":\"$disk_size\"}"
}

# Start CPU stress
start_cpu_stress() {
    local cpu_workers="$1"
    
    log "Starting CPU stress with $cpu_workers workers"
    
    # CPU stress with matrix operations
    stress-ng --cpu "$cpu_workers" --cpu-method matrixprod --timeout 0 &
    local pid=$!
    STRESS_PIDS+=($pid)
    
    log "CPU stress started with PID $pid"
}

# Start memory stress
start_memory_stress() {
    local memory_workers="$1"
    local memory_size="$2"
    
    log "Starting memory stress with $memory_workers workers, ${memory_size}MB each"
    
    # Memory stress with malloc/free cycles
    stress-ng --vm "$memory_workers" --vm-bytes "${memory_size}M" --vm-method flip --timeout 0 &
    local pid=$!
    STRESS_PIDS+=($pid)
    
    log "Memory stress started with PID $pid"
}

# Start disk stress
start_disk_stress() {
    local disk_workers="$1"
    local disk_size="$2"
    
    log "Starting disk stress with $disk_workers workers, $disk_size each"
    
    # Create temporary directory for stress test
    local temp_dir="/tmp/disk-stress-$$"
    mkdir -p "$temp_dir"
    
    # Disk I/O stress
    stress-ng --hdd "$disk_workers" --hdd-bytes "$disk_size" --temp-path "$temp_dir" --timeout 0 &
    local pid=$!
    STRESS_PIDS+=($pid)
    
    log "Disk stress started with PID $pid in $temp_dir"
}

# Start network stress
start_network_stress() {
    local workers="$1"
    
    log "Starting network stress with $workers workers"
    
    # Network stress with socket operations
    stress-ng --sock "$workers" --sock-domain ipv4 --sock-type stream --timeout 0 &
    local pid=$!
    STRESS_PIDS+=($pid)
    
    log "Network stress started with PID $pid"
}

# Start appropriate stress based on resource type
start_resource_stress() {
    local resource_type="$1"
    local intensity="$2"
    
    local params=$(calculate_stress_params "$resource_type" "$intensity")
    log "Stress parameters: $params"
    
    case "$resource_type" in
        "cpu")
            local cpu_workers=$(echo "$params" | jq -r '.cpu_workers')
            start_cpu_stress "$cpu_workers"
            ;;
        "memory")
            local memory_workers=$(echo "$params" | jq -r '.memory_workers')
            local memory_size=$(echo "$params" | jq -r '.memory_size_mb')
            start_memory_stress "$memory_workers" "$memory_size"
            ;;
        "disk")
            local disk_workers=$(echo "$params" | jq -r '.disk_workers')
            local disk_size=$(echo "$params" | jq -r '.disk_size')
            start_disk_stress "$disk_workers" "$disk_size"
            ;;
        "network")
            local workers=4
            start_network_stress "$workers"
            ;;
        "mixed")
            local cpu_workers=$(echo "$params" | jq -r '.cpu_workers')
            local memory_workers=$(echo "$params" | jq -r '.memory_workers')
            local memory_size=$(echo "$params" | jq -r '.memory_size_mb')
            local disk_workers=$(echo "$params" | jq -r '.disk_workers')
            local disk_size=$(echo "$params" | jq -r '.disk_size')
            
            start_cpu_stress "$cpu_workers"
            start_memory_stress "$memory_workers" "$memory_size"
            start_disk_stress "$disk_workers" "$disk_size"
            start_network_stress 2
            ;;
        *)
            error "Invalid resource type: $resource_type"
            exit 1
            ;;
    esac
}

# Get current resource usage
get_resource_usage() {
    # CPU usage (1-minute average)
    local cpu_usage=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    # Memory usage
    local memory_info=$(free -m | awk 'NR==2{printf "%.2f %.2f", $3/$2*100, $2}')
    local memory_usage=$(echo "$memory_info" | awk '{print $1}')
    local total_memory=$(echo "$memory_info" | awk '{print $2}')
    
    # Disk usage
    local disk_info=$(df -h / | awk 'NR==2{print $5 " " $4}')
    local disk_usage=$(echo "$disk_info" | awk '{print $1}' | sed 's/%//')
    local available_disk=$(echo "$disk_info" | awk '{print $2}')
    
    # Process count
    local process_count=$(ps aux | wc -l)
    
    echo "{\"cpu_load\":$cpu_usage,\"memory_usage_percent\":$memory_usage,\"total_memory_mb\":$total_memory,\"disk_usage_percent\":$disk_usage,\"available_disk\":\"$available_disk\",\"process_count\":$process_count}"
}

# Get backend service metrics
get_service_metrics() {
    local service_status="unknown"
    local response_time="null"
    local process_count=0
    
    # Check service health
    if curl -s -w "%{http_code}" -o /dev/null "http://localhost:3000/api/v1/healthz" | grep -q "200"; then
        service_status="healthy"
        response_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:3000/api/v1/healthz" || echo "null")
    else
        service_status="unhealthy"
    fi
    
    # Count backend processes
    process_count=$(pgrep -f "main.js" | wc -l)
    
    # Get memory usage of backend processes
    local backend_memory=0
    if [[ $process_count -gt 0 ]]; then
        backend_memory=$(pgrep -f "main.js" | xargs -I {} ps -p {} -o rss= | awk '{sum+=$1} END {print sum/1024}' || echo "0")
    fi
    
    echo "{\"service_status\":\"$service_status\",\"response_time\":$response_time,\"process_count\":$process_count,\"memory_usage_mb\":$backend_memory}"
}

# Monitor system during stress
monitor_system() {
    local duration=$1
    local start_time=$(date +%s)
    local end_time=$((start_time + duration * 60))
    
    log "Starting system monitoring for $duration minutes..."
    
    # Initialize metrics
    local system_resources=$(get_system_resources)
    cat > "$METRICS_FILE" << EOF
{
    "experiment": "resource-exhaustion",
    "resource_type": "$RESOURCE_TYPE",
    "intensity": "$INTENSITY",
    "system_resources": $system_resources,
    "start_time": "$start_time",
    "duration_minutes": $duration,
    "stress_pids": [$(IFS=,; echo "${STRESS_PIDS[*]}")],
    "metrics": []
}
EOF
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        # Get resource usage
        local resource_usage=$(get_resource_usage)
        
        # Get service metrics
        local service_metrics=$(get_service_metrics)
        
        # Check if stress processes are still running
        local active_stress_pids=()
        for pid in "${STRESS_PIDS[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                active_stress_pids+=($pid)
            fi
        done
        
        # Record metrics
        local metric_entry=$(cat << EOF
{
    "timestamp": $current_time,
    "elapsed_seconds": $elapsed,
    "resource_usage": $resource_usage,
    "service_metrics": $service_metrics,
    "active_stress_pids": [$(IFS=,; echo "${active_stress_pids[*]}")],
    "stress_process_count": ${#active_stress_pids[@]}
}
EOF
)
        
        # Append to metrics file
        jq --argjson metric "$metric_entry" '.metrics += [$metric]' "$METRICS_FILE" > "${METRICS_FILE}.tmp" && mv "${METRICS_FILE}.tmp" "$METRICS_FILE"
        
        # Log current status
        local cpu_load=$(echo "$resource_usage" | jq -r '.cpu_load')
        local memory_usage=$(echo "$resource_usage" | jq -r '.memory_usage_percent')
        local disk_usage=$(echo "$resource_usage" | jq -r '.disk_usage_percent')
        local service_status=$(echo "$service_metrics" | jq -r '.service_status')
        
        info "Resources: CPU=${cpu_load}, Memory=${memory_usage}%, Disk=${disk_usage}%, Service=${service_status}, Stress=${#active_stress_pids[@]} procs"
        
        sleep 10
    done
    
    # Finalize metrics
    jq --arg end_time "$(date +%s)" '.end_time = $end_time' "$METRICS_FILE" > "${METRICS_FILE}.tmp" && mv "${METRICS_FILE}.tmp" "$METRICS_FILE"
    
    log "System monitoring completed"
}

# Stop all stress processes
stop_stress() {
    log "Stopping stress processes..."
    
    for pid in "${STRESS_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            log "Stopping stress process $pid"
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done
    
    # Wait for processes to stop gracefully
    sleep 5
    
    # Force kill any remaining processes
    for pid in "${STRESS_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            warn "Force killing stress process $pid"
            kill -KILL "$pid" 2>/dev/null || true
        fi
    done
    
    # Clean up temporary directories
    rm -rf /tmp/disk-stress-*
    
    log "All stress processes stopped"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    stop_stress
    
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
    log "Starting Resource Exhaustion Chaos Experiment"
    log "Duration: $DURATION_MINUTES minutes"
    log "Resource Type: $RESOURCE_TYPE"
    log "Intensity: $INTENSITY"
    log "Log file: $LOG_FILE"
    log "Metrics file: $METRICS_FILE"
    
    preflight_checks
    
    # Start stress processes
    start_resource_stress "$RESOURCE_TYPE" "$INTENSITY"
    
    log "Stress test started with PIDs: ${STRESS_PIDS[*]}"
    
    # Start monitoring
    monitor_system "$DURATION_MINUTES"
    
    log "Resource Exhaustion Chaos Experiment completed"
    log "Metrics saved to: $METRICS_FILE"
    log "Logs saved to: $LOG_FILE"
    
    # Display summary
    echo
    echo "=== EXPERIMENT SUMMARY ==="
    echo "Duration: $DURATION_MINUTES minutes"
    echo "Resource Type: $RESOURCE_TYPE"
    echo "Intensity: $INTENSITY"
    echo "Metrics: $METRICS_FILE"
    echo "Logs: $LOG_FILE"
    echo
    
    # Show final metrics
    if [[ -f "$METRICS_FILE" ]]; then
        echo "Resource usage summary:"
        local max_cpu=$(jq -r '.metrics | max_by(.resource_usage.cpu_load) | .resource_usage.cpu_load' "$METRICS_FILE")
        local max_memory=$(jq -r '.metrics | max_by(.resource_usage.memory_usage_percent) | .resource_usage.memory_usage_percent' "$METRICS_FILE")
        local service_healthy_count=$(jq -r '.metrics | map(select(.service_metrics.service_status == "healthy")) | length' "$METRICS_FILE")
        local total_metrics=$(jq -r '.metrics | length' "$METRICS_FILE")
        
        echo "Max CPU load: $max_cpu"
        echo "Max memory usage: ${max_memory}%"
        echo "Service healthy: $service_healthy_count/$total_metrics samples"
        
        jq -r '.metrics[-1] | "Final status: Service=\(.service_metrics.service_status), CPU=\(.resource_usage.cpu_load), Memory=\(.resource_usage.memory_usage_percent)%"' "$METRICS_FILE"
    fi
}

# Help function
show_help() {
    cat << EOF
Resource Exhaustion Chaos Script

Usage: $0 [duration_minutes] [resource_type] [intensity]

Arguments:
    duration_minutes    Duration to run stress test (default: 10)
    resource_type       Type of resource to stress (default: memory)
                       Options: cpu, memory, disk, network, mixed
    intensity           Stress intensity (default: medium)
                       Options: low, medium, high

Examples:
    $0                          # 10 minutes of medium memory stress
    $0 5 cpu high              # 5 minutes of high CPU stress
    $0 15 mixed low            # 15 minutes of low mixed stress
    $0 30 disk medium          # 30 minutes of medium disk stress

Resource Types:
    cpu     - CPU intensive matrix operations
    memory  - Memory allocation/deallocation cycles
    disk    - Disk I/O operations
    network - Network socket operations
    mixed   - Combination of all resource types

Intensity Levels:
    low     - Light stress (50% of resources)
    medium  - Moderate stress (100% of resources)
    high    - Heavy stress (200% of resources)

This script monitors:
- System resource usage (CPU, memory, disk)
- Service health and response times
- Process counts and memory usage
- Stress process status

Requirements:
- stress-ng must be installed
- Backend service should be running
- curl, jq, free, df, nproc must be available

EOF
}

# Validate arguments
validate_args() {
    if ! [[ "$DURATION_MINUTES" =~ ^[0-9]+$ ]]; then
        error "Duration must be a positive integer"
        exit 1
    fi
    
    if ! [[ "$RESOURCE_TYPE" =~ ^(cpu|memory|disk|network|mixed)$ ]]; then
        error "Resource type must be one of: cpu, memory, disk, network, mixed"
        exit 1
    fi
    
    if ! [[ "$INTENSITY" =~ ^(low|medium|high)$ ]]; then
        error "Intensity must be one of: low, medium, high"
        exit 1
    fi
}

# Check for help flag
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

# Validate arguments
validate_args

# Run main function
main "$@"