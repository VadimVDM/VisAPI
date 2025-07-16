#!/bin/bash

# Main Chaos Engineering Runner
# Orchestrates different chaos experiments with safety checks and reporting
# Usage: ./run-chaos.sh [experiment] [--duration minutes] [--intensity level] [--report-only]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"
REPORTS_DIR="$SCRIPT_DIR/reports"
LOG_FILE="$REPORTS_DIR/chaos-runner.log"
SUMMARY_FILE="$REPORTS_DIR/chaos-summary.json"

# Default values
DEFAULT_DURATION=5
DEFAULT_INTENSITY="medium"
DEFAULT_FAILURE_RATE=50

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Available experiments
declare -A EXPERIMENTS=(
    ["network-partition"]="Network Partition - Simulate Redis connectivity issues"
    ["service-failure"]="Service Failure - Simulate process crashes and restarts"
    ["resource-exhaustion"]="Resource Exhaustion - Simulate CPU/memory/disk pressure"
    ["external-service-failure"]="External Service Failure - Simulate API failures"
    ["full-chaos"]="Full Chaos - Run all experiments in sequence"
)

# Logging functions
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

banner() {
    echo -e "${CYAN}${BOLD}$1${NC}" | tee -a "$LOG_FILE"
}

# Initialize directories
init_directories() {
    mkdir -p "$REPORTS_DIR"
    mkdir -p "$REPORTS_DIR/experiments"
    mkdir -p "$REPORTS_DIR/metrics"
    mkdir -p "$REPORTS_DIR/logs"
    
    # Initialize summary file
    cat > "$SUMMARY_FILE" << EOF
{
    "chaos_runner_version": "1.0",
    "start_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "experiments": []
}
EOF
}

# Safety checks before running experiments
safety_checks() {
    banner "=== SAFETY CHECKS ==="
    
    local checks_passed=0
    local total_checks=0
    
    # Check if we're in a safe environment
    ((total_checks++))
    if [[ -n "${CHAOS_SAFE_MODE:-}" ]]; then
        log "✓ Running in safe mode (CHAOS_SAFE_MODE is set)"
        ((checks_passed++))
    else
        warn "⚠ CHAOS_SAFE_MODE is not set. This should only be run in staging/test environments"
    fi
    
    # Check if required scripts exist
    ((total_checks++))
    local required_scripts=("network-partition.sh" "service-failure.sh" "resource-exhaustion.sh" "external-service-failure.sh")
    local missing_scripts=()
    
    for script in "${required_scripts[@]}"; do
        if [[ ! -f "$SCRIPTS_DIR/$script" ]]; then
            missing_scripts+=("$script")
        fi
    done
    
    if [[ ${#missing_scripts[@]} -eq 0 ]]; then
        log "✓ All required scripts are present"
        ((checks_passed++))
    else
        error "✗ Missing scripts: ${missing_scripts[*]}"
    fi
    
    # Check if backend service is running
    ((total_checks++))
    if pgrep -f "main.js" > /dev/null; then
        log "✓ Backend service is running"
        ((checks_passed++))
    else
        error "✗ Backend service is not running"
    fi
    
    # Check if required tools are available
    ((total_checks++))
    local required_tools=("curl" "jq" "nc")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -eq 0 ]]; then
        log "✓ All required tools are available"
        ((checks_passed++))
    else
        error "✗ Missing tools: ${missing_tools[*]}"
    fi
    
    # Check system resources
    ((total_checks++))
    local available_memory=$(free -m | awk 'NR==2{print $7}')
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    if [[ "$available_memory" -gt 1000 ]] && [[ $(echo "$cpu_load < 2.0" | bc) -eq 1 ]]; then
        log "✓ System resources are adequate (Memory: ${available_memory}MB, Load: $cpu_load)"
        ((checks_passed++))
    else
        warn "⚠ System resources may be low (Memory: ${available_memory}MB, Load: $cpu_load)"
        ((checks_passed++))  # Don't fail for this, just warn
    fi
    
    # Check if health endpoint is accessible
    ((total_checks++))
    if curl -s -f "http://localhost:3000/api/v1/healthz" > /dev/null; then
        log "✓ Health endpoint is accessible"
        ((checks_passed++))
    else
        error "✗ Health endpoint is not accessible"
    fi
    
    # Summary
    banner "Safety Check Results: $checks_passed/$total_checks passed"
    
    if [[ $checks_passed -eq $total_checks ]]; then
        log "✓ All safety checks passed. Ready to run chaos experiments."
        return 0
    else
        error "✗ Some safety checks failed. Please address the issues before running chaos experiments."
        return 1
    fi
}

# Run a single experiment
run_experiment() {
    local experiment="$1"
    local duration="$2"
    local intensity="$3"
    local failure_rate="$4"
    
    local experiment_start=$(date +%s)
    local experiment_id="chaos-$(date +%Y%m%d-%H%M%S)-$experiment"
    
    banner "=== RUNNING EXPERIMENT: $experiment ==="
    log "Experiment ID: $experiment_id"
    log "Duration: $duration minutes"
    log "Intensity: $intensity"
    log "Failure Rate: ${failure_rate}%"
    
    # Prepare experiment directory
    local exp_dir="$REPORTS_DIR/experiments/$experiment_id"
    mkdir -p "$exp_dir"
    
    # Run the specific experiment
    local exit_code=0
    case "$experiment" in
        "network-partition")
            log "Starting network partition experiment..."
            if sudo "$SCRIPTS_DIR/network-partition.sh" "$duration" > "$exp_dir/output.log" 2>&1; then
                log "✓ Network partition experiment completed successfully"
            else
                exit_code=$?
                error "✗ Network partition experiment failed with exit code $exit_code"
            fi
            ;;
        "service-failure")
            log "Starting service failure experiment..."
            if "$SCRIPTS_DIR/service-failure.sh" "$duration" 60 > "$exp_dir/output.log" 2>&1; then
                log "✓ Service failure experiment completed successfully"
            else
                exit_code=$?
                error "✗ Service failure experiment failed with exit code $exit_code"
            fi
            ;;
        "resource-exhaustion")
            log "Starting resource exhaustion experiment..."
            if "$SCRIPTS_DIR/resource-exhaustion.sh" "$duration" "mixed" "$intensity" > "$exp_dir/output.log" 2>&1; then
                log "✓ Resource exhaustion experiment completed successfully"
            else
                exit_code=$?
                error "✗ Resource exhaustion experiment failed with exit code $exit_code"
            fi
            ;;
        "external-service-failure")
            log "Starting external service failure experiment..."
            if sudo "$SCRIPTS_DIR/external-service-failure.sh" "$duration" "all" "$failure_rate" > "$exp_dir/output.log" 2>&1; then
                log "✓ External service failure experiment completed successfully"
            else
                exit_code=$?
                error "✗ External service failure experiment failed with exit code $exit_code"
            fi
            ;;
        *)
            error "Unknown experiment: $experiment"
            exit_code=1
            ;;
    esac
    
    local experiment_end=$(date +%s)
    local experiment_duration=$((experiment_end - experiment_start))
    
    # Copy metrics files to experiment directory
    cp /tmp/*-chaos*.log "$exp_dir/" 2>/dev/null || true
    cp /tmp/*-chaos*.json "$exp_dir/" 2>/dev/null || true
    
    # Generate experiment summary
    local experiment_summary=$(cat << EOF
{
    "experiment_id": "$experiment_id",
    "experiment_type": "$experiment",
    "start_time": $experiment_start,
    "end_time": $experiment_end,
    "duration_seconds": $experiment_duration,
    "duration_minutes": $duration,
    "intensity": "$intensity",
    "failure_rate": $failure_rate,
    "exit_code": $exit_code,
    "success": $([ $exit_code -eq 0 ] && echo "true" || echo "false"),
    "output_log": "$exp_dir/output.log",
    "metrics_dir": "$exp_dir"
}
EOF
)
    
    # Add to summary file
    jq --argjson experiment "$experiment_summary" '.experiments += [$experiment]' "$SUMMARY_FILE" > "${SUMMARY_FILE}.tmp" && mv "${SUMMARY_FILE}.tmp" "$SUMMARY_FILE"
    
    log "Experiment $experiment completed in ${experiment_duration}s"
    
    return $exit_code
}

# Run full chaos test suite
run_full_chaos() {
    local duration="$1"
    local intensity="$2"
    local failure_rate="$3"
    
    banner "=== RUNNING FULL CHAOS TEST SUITE ==="
    
    local experiments=("network-partition" "service-failure" "resource-exhaustion" "external-service-failure")
    local failed_experiments=()
    
    for experiment in "${experiments[@]}"; do
        info "Running experiment: $experiment"
        if ! run_experiment "$experiment" "$duration" "$intensity" "$failure_rate"; then
            failed_experiments+=("$experiment")
        fi
        
        # Wait between experiments
        if [[ "$experiment" != "${experiments[-1]}" ]]; then
            log "Waiting 30 seconds before next experiment..."
            sleep 30
        fi
    done
    
    # Summary
    if [[ ${#failed_experiments[@]} -eq 0 ]]; then
        log "✓ All chaos experiments completed successfully"
    else
        error "✗ Failed experiments: ${failed_experiments[*]}"
        return 1
    fi
}

# Generate final report
generate_report() {
    local report_file="$REPORTS_DIR/chaos-report-$(date +%Y%m%d-%H%M%S).html"
    
    banner "=== GENERATING CHAOS REPORT ==="
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Chaos Engineering Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .experiment { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .success { border-left: 5px solid #4CAF50; }
        .failure { border-left: 5px solid #f44336; }
        .warning { border-left: 5px solid #ff9800; }
        .metrics { background: #f9f9f9; padding: 10px; border-radius: 3px; }
        .code { background: #f0f0f0; padding: 10px; border-radius: 3px; font-family: monospace; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Chaos Engineering Report</h1>
        <p><strong>Generated:</strong> $(date)</p>
        <p><strong>Duration:</strong> Multiple experiments</p>
        <p><strong>Environment:</strong> $(hostname)</p>
    </div>
EOF
    
    # Add experiment results
    if [[ -f "$SUMMARY_FILE" ]]; then
        local total_experiments=$(jq '.experiments | length' "$SUMMARY_FILE")
        local successful_experiments=$(jq '.experiments | map(select(.success == true)) | length' "$SUMMARY_FILE")
        local failed_experiments=$(jq '.experiments | map(select(.success == false)) | length' "$SUMMARY_FILE")
        
        cat >> "$report_file" << EOF
    <div class="experiment">
        <h2>Summary</h2>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total Experiments</td><td>$total_experiments</td></tr>
            <tr><td>Successful</td><td>$successful_experiments</td></tr>
            <tr><td>Failed</td><td>$failed_experiments</td></tr>
            <tr><td>Success Rate</td><td>$(( successful_experiments * 100 / total_experiments ))%</td></tr>
        </table>
    </div>
EOF
        
        # Add individual experiment details
        local experiment_count=0
        while read -r experiment; do
            local exp_type=$(echo "$experiment" | jq -r '.experiment_type')
            local exp_id=$(echo "$experiment" | jq -r '.experiment_id')
            local success=$(echo "$experiment" | jq -r '.success')
            local duration=$(echo "$experiment" | jq -r '.duration_seconds')
            local intensity=$(echo "$experiment" | jq -r '.intensity')
            
            local status_class="success"
            local status_text="✓ Success"
            if [[ "$success" == "false" ]]; then
                status_class="failure"
                status_text="✗ Failed"
            fi
            
            cat >> "$report_file" << EOF
    <div class="experiment $status_class">
        <h3>$exp_type ($status_text)</h3>
        <p><strong>ID:</strong> $exp_id</p>
        <p><strong>Duration:</strong> ${duration}s</p>
        <p><strong>Intensity:</strong> $intensity</p>
    </div>
EOF
            ((experiment_count++))
        done < <(jq -c '.experiments[]' "$SUMMARY_FILE")
    fi
    
    cat >> "$report_file" << EOF
    <div class="experiment">
        <h2>Recommendations</h2>
        <ul>
            <li>Review failed experiments and address any identified issues</li>
            <li>Consider automating chaos experiments in CI/CD pipeline</li>
            <li>Monitor system metrics during experiments</li>
            <li>Update incident response procedures based on findings</li>
        </ul>
    </div>
</body>
</html>
EOF
    
    log "Report generated: $report_file"
}

# Show experiment status
show_status() {
    banner "=== EXPERIMENT STATUS ==="
    
    if [[ -f "$SUMMARY_FILE" ]]; then
        local total_experiments=$(jq '.experiments | length' "$SUMMARY_FILE")
        local successful_experiments=$(jq '.experiments | map(select(.success == true)) | length' "$SUMMARY_FILE")
        local failed_experiments=$(jq '.experiments | map(select(.success == false)) | length' "$SUMMARY_FILE")
        
        echo "Total Experiments: $total_experiments"
        echo "Successful: $successful_experiments"
        echo "Failed: $failed_experiments"
        echo
        
        if [[ $total_experiments -gt 0 ]]; then
            echo "Recent Experiments:"
            jq -r '.experiments[] | "\(.experiment_type) - \(if .success then "✓" else "✗" end) - \(.duration_seconds)s"' "$SUMMARY_FILE" | tail -5
        fi
    else
        echo "No experiments have been run yet."
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up chaos runner..."
    
    # Kill any running experiments
    pkill -f "network-partition.sh" 2>/dev/null || true
    pkill -f "service-failure.sh" 2>/dev/null || true
    pkill -f "resource-exhaustion.sh" 2>/dev/null || true
    pkill -f "external-service-failure.sh" 2>/dev/null || true
    
    # Finalize summary
    if [[ -f "$SUMMARY_FILE" ]]; then
        jq --arg end_time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.end_time = $end_time' "$SUMMARY_FILE" > "${SUMMARY_FILE}.tmp" && mv "${SUMMARY_FILE}.tmp" "$SUMMARY_FILE"
    fi
    
    log "Cleanup completed"
}

# Signal handlers
trap cleanup EXIT
trap cleanup SIGINT
trap cleanup SIGTERM

# Show help
show_help() {
    cat << EOF
Chaos Engineering Runner

Usage: $0 [experiment] [OPTIONS]

Experiments:
$(for exp in "${!EXPERIMENTS[@]}"; do
    echo "    $exp - ${EXPERIMENTS[$exp]}"
done)

Options:
    --duration MINUTES      Duration for each experiment (default: $DEFAULT_DURATION)
    --intensity LEVEL       Intensity level: low, medium, high (default: $DEFAULT_INTENSITY)
    --failure-rate PERCENT  Failure rate for external services (default: $DEFAULT_FAILURE_RATE)
    --report-only          Generate report from existing results
    --status               Show current experiment status
    --help                 Show this help message

Examples:
    $0 network-partition --duration 10
    $0 service-failure --duration 5 --intensity high
    $0 external-service-failure --duration 15 --failure-rate 75
    $0 full-chaos --duration 5 --intensity medium
    $0 --report-only
    $0 --status

Environment Variables:
    CHAOS_SAFE_MODE=1      Set to enable safe mode (recommended)

Requirements:
    - Must be run in staging/test environment
    - Backend service must be running
    - Required tools: curl, jq, nc, sudo access
    - Python 3 for external service failure simulation

Safety:
    - Always run in staging/test environments only
    - Set CHAOS_SAFE_MODE=1 environment variable
    - Monitor system resources during experiments
    - Have rollback procedures ready

EOF
}

# Parse arguments
parse_args() {
    local experiment=""
    local duration="$DEFAULT_DURATION"
    local intensity="$DEFAULT_INTENSITY"
    local failure_rate="$DEFAULT_FAILURE_RATE"
    local report_only=false
    local status_only=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --duration)
                duration="$2"
                shift 2
                ;;
            --intensity)
                intensity="$2"
                shift 2
                ;;
            --failure-rate)
                failure_rate="$2"
                shift 2
                ;;
            --report-only)
                report_only=true
                shift
                ;;
            --status)
                status_only=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            -*)
                error "Unknown option: $1"
                exit 1
                ;;
            *)
                if [[ -z "$experiment" ]]; then
                    experiment="$1"
                else
                    error "Multiple experiments specified"
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Handle special modes
    if [[ "$report_only" == "true" ]]; then
        generate_report
        exit 0
    fi
    
    if [[ "$status_only" == "true" ]]; then
        show_status
        exit 0
    fi
    
    # Validate experiment
    if [[ -z "$experiment" ]]; then
        show_help
        exit 1
    fi
    
    if [[ ! "${EXPERIMENTS[$experiment]:-}" ]]; then
        error "Unknown experiment: $experiment"
        echo "Available experiments: ${!EXPERIMENTS[*]}"
        exit 1
    fi
    
    # Export values for use in main function
    export PARSED_EXPERIMENT="$experiment"
    export PARSED_DURATION="$duration"
    export PARSED_INTENSITY="$intensity"
    export PARSED_FAILURE_RATE="$failure_rate"
}

# Main execution
main() {
    banner "🔥 CHAOS ENGINEERING RUNNER 🔥"
    log "Starting chaos engineering experiments..."
    
    init_directories
    
    # Run safety checks
    if ! safety_checks; then
        error "Safety checks failed. Aborting chaos experiments."
        exit 1
    fi
    
    # Run the experiment
    local exit_code=0
    if [[ "$PARSED_EXPERIMENT" == "full-chaos" ]]; then
        run_full_chaos "$PARSED_DURATION" "$PARSED_INTENSITY" "$PARSED_FAILURE_RATE" || exit_code=$?
    else
        run_experiment "$PARSED_EXPERIMENT" "$PARSED_DURATION" "$PARSED_INTENSITY" "$PARSED_FAILURE_RATE" || exit_code=$?
    fi
    
    # Generate report
    generate_report
    
    # Final summary
    banner "=== CHAOS ENGINEERING COMPLETED ==="
    log "Logs: $LOG_FILE"
    log "Summary: $SUMMARY_FILE"
    log "Reports: $REPORTS_DIR"
    
    if [[ $exit_code -eq 0 ]]; then
        log "✓ All experiments completed successfully"
    else
        error "✗ Some experiments failed (exit code: $exit_code)"
    fi
    
    exit $exit_code
}

# Parse arguments and run main
parse_args "$@"
main