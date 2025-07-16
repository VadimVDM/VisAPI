#!/bin/bash

# Chaos Engineering Setup Verification Script
# Verifies all dependencies and scripts are correctly configured

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] ℹ $1${NC}"
}

banner() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

# Check if required tools are installed
check_tools() {
    banner "CHECKING REQUIRED TOOLS"
    
    local tools=(
        "curl:HTTP client for API calls"
        "jq:JSON processor for metrics"
        "nc:Network utility for connectivity tests"
        "stress-ng:System stress testing tool"
        "python3:Python runtime for proxy server"
        "pgrep:Process finder"
        "pkill:Process killer"
        "iptables:Firewall rules (requires sudo)"
        "free:Memory information"
        "df:Disk space information"
        "uptime:System load information"
        "bc:Basic calculator for math operations"
    )
    
    local missing_tools=()
    
    for tool_desc in "${tools[@]}"; do
        local tool=$(echo "$tool_desc" | cut -d':' -f1)
        local desc=$(echo "$tool_desc" | cut -d':' -f2)
        
        if command -v "$tool" &> /dev/null; then
            log "$tool - $desc"
        else
            error "$tool - $desc (MISSING)"
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "Missing tools: ${missing_tools[*]}"
        echo
        echo "Installation commands:"
        echo "  Ubuntu/Debian: sudo apt-get install curl jq netcat-openbsd stress-ng python3 bc"
        echo "  macOS: brew install curl jq netcat stress-ng python3 bc"
        echo
        return 1
    fi
    
    log "All required tools are installed"
    return 0
}

# Check Python dependencies
check_python_deps() {
    banner "CHECKING PYTHON DEPENDENCIES"
    
    local deps=("requests" "json" "http.server" "socketserver" "urllib")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if python3 -c "import $dep" 2>/dev/null; then
            log "Python module: $dep"
        else
            error "Python module: $dep (MISSING)"
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        error "Missing Python dependencies: ${missing_deps[*]}"
        echo
        echo "Installation command:"
        echo "  pip3 install requests"
        echo
        return 1
    fi
    
    log "All Python dependencies are available"
    return 0
}

# Check script files
check_scripts() {
    banner "CHECKING CHAOS SCRIPTS"
    
    local scripts=(
        "run-chaos.sh:Main chaos runner"
        "scripts/network-partition.sh:Network partition simulation"
        "scripts/service-failure.sh:Service failure simulation"
        "scripts/resource-exhaustion.sh:Resource exhaustion simulation"
        "scripts/external-service-failure.sh:External service failure simulation"
    )
    
    local missing_scripts=()
    
    for script_desc in "${scripts[@]}"; do
        local script=$(echo "$script_desc" | cut -d':' -f1)
        local desc=$(echo "$script_desc" | cut -d':' -f2)
        local script_path="$SCRIPT_DIR/$script"
        
        if [[ -f "$script_path" ]]; then
            if [[ -x "$script_path" ]]; then
                log "$script - $desc (executable)"
            else
                warn "$script - $desc (not executable)"
                chmod +x "$script_path"
                log "$script - Made executable"
            fi
        else
            error "$script - $desc (MISSING)"
            missing_scripts+=("$script")
        fi
    done
    
    if [[ ${#missing_scripts[@]} -gt 0 ]]; then
        error "Missing scripts: ${missing_scripts[*]}"
        return 1
    fi
    
    log "All chaos scripts are present and executable"
    return 0
}

# Check environment configuration
check_environment() {
    banner "CHECKING ENVIRONMENT CONFIGURATION"
    
    # Check for .env file
    if [[ -f "$SCRIPT_DIR/.env" ]]; then
        log "Found .env configuration file"
        # Source the .env file
        set -a
        source "$SCRIPT_DIR/.env"
        set +a
    elif [[ -f "$SCRIPT_DIR/.env.example" ]]; then
        warn "No .env file found, but .env.example exists"
        info "Copy .env.example to .env and customize as needed"
    else
        warn "No environment configuration files found"
    fi
    
    # Check CHAOS_SAFE_MODE
    if [[ "${CHAOS_SAFE_MODE:-}" == "1" ]]; then
        log "CHAOS_SAFE_MODE is enabled"
    else
        warn "CHAOS_SAFE_MODE is not set to 1"
        info "Set CHAOS_SAFE_MODE=1 before running experiments"
    fi
    
    # Check other environment variables
    local env_vars=(
        "CHAOS_DURATION:Experiment duration"
        "CHAOS_INTENSITY:Experiment intensity"
        "CHAOS_FAILURE_RATE:Failure rate for external services"
    )
    
    for var_desc in "${env_vars[@]}"; do
        local var=$(echo "$var_desc" | cut -d':' -f1)
        local desc=$(echo "$var_desc" | cut -d':' -f2)
        
        if [[ -n "${!var:-}" ]]; then
            log "$var=${!var} - $desc"
        else
            info "$var not set - $desc (will use defaults)"
        fi
    done
    
    log "Environment configuration checked"
    return 0
}

# Check system resources
check_system_resources() {
    banner "CHECKING SYSTEM RESOURCES"
    
    # Check available memory
    local available_memory=$(free -m | awk 'NR==2{print $7}')
    if [[ "$available_memory" -gt 1000 ]]; then
        log "Available memory: ${available_memory}MB (sufficient)"
    else
        warn "Available memory: ${available_memory}MB (may be low for stress tests)"
    fi
    
    # Check CPU load
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    if [[ $(echo "$cpu_load < 2.0" | bc) -eq 1 ]]; then
        log "CPU load: $cpu_load (normal)"
    else
        warn "CPU load: $cpu_load (high)"
    fi
    
    # Check disk space
    local disk_space=$(df -h / | awk 'NR==2{print $4}')
    local disk_usage=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
    if [[ "$disk_usage" -lt 80 ]]; then
        log "Disk usage: ${disk_usage}% (${disk_space} free)"
    else
        warn "Disk usage: ${disk_usage}% (${disk_space} free) - may be high"
    fi
    
    # Check CPU cores
    local cpu_cores=$(nproc)
    log "CPU cores: $cpu_cores"
    
    log "System resources checked"
    return 0
}

# Check backend service
check_backend_service() {
    banner "CHECKING BACKEND SERVICE"
    
    local backend_host="${BACKEND_HOST:-localhost}"
    local backend_port="${BACKEND_PORT:-3000}"
    local health_endpoint="${BACKEND_HEALTH_ENDPOINT:-/api/v1/healthz}"
    
    # Check if backend process is running
    if pgrep -f "main.js" > /dev/null; then
        log "Backend process is running"
    else
        warn "Backend process (main.js) is not running"
        info "Start the backend service before running chaos experiments"
    fi
    
    # Check if backend is accessible
    local backend_url="http://${backend_host}:${backend_port}${health_endpoint}"
    if curl -s -f "$backend_url" > /dev/null; then
        log "Backend health endpoint is accessible: $backend_url"
    else
        warn "Backend health endpoint is not accessible: $backend_url"
        info "Ensure backend service is running and accessible"
    fi
    
    log "Backend service checked"
    return 0
}

# Check network connectivity
check_network_connectivity() {
    banner "CHECKING NETWORK CONNECTIVITY"
    
    local redis_host="${REDIS_HOST:-redis-10000.c1.us-east-1-2.ec2.redns.redis-cloud.com}"
    local redis_port="${REDIS_PORT:-10000}"
    
    # Check Redis connectivity
    if nc -z "$redis_host" "$redis_port" 2>/dev/null; then
        log "Redis is reachable: $redis_host:$redis_port"
    else
        warn "Redis is not reachable: $redis_host:$redis_port"
        info "This may be expected if Redis is not running or accessible"
    fi
    
    # Check external services
    local services=(
        "hooks.slack.com:443:Slack webhooks"
        "cgbapi.co:443:WhatsApp API"
        "api.resend.com:443:Email API"
    )
    
    for service_desc in "${services[@]}"; do
        local host=$(echo "$service_desc" | cut -d':' -f1)
        local port=$(echo "$service_desc" | cut -d':' -f2)
        local desc=$(echo "$service_desc" | cut -d':' -f3)
        
        if nc -z "$host" "$port" 2>/dev/null; then
            log "$desc: $host:$port (reachable)"
        else
            info "$desc: $host:$port (not reachable - may be normal)"
        fi
    done
    
    log "Network connectivity checked"
    return 0
}

# Check permissions
check_permissions() {
    banner "CHECKING PERMISSIONS"
    
    # Check sudo access
    if sudo -n true 2>/dev/null; then
        log "Sudo access is available (passwordless)"
    else
        warn "Sudo access may require password"
        info "Some experiments (network-partition, external-service-failure) require sudo"
    fi
    
    # Check iptables access
    if sudo iptables -L > /dev/null 2>&1; then
        log "iptables is accessible"
    else
        warn "iptables is not accessible"
        info "Network partition experiments require iptables access"
    fi
    
    # Check /etc/hosts write access
    if [[ -w /etc/hosts ]] || sudo test -w /etc/hosts; then
        log "/etc/hosts is writable"
    else
        warn "/etc/hosts is not writable"
        info "External service failure experiments require hosts file modification"
    fi
    
    log "Permissions checked"
    return 0
}

# Run a quick test
run_quick_test() {
    banner "RUNNING QUICK TEST"
    
    info "Testing main chaos runner help..."
    if "$SCRIPT_DIR/run-chaos.sh" --help > /dev/null 2>&1; then
        log "Main chaos runner is working"
    else
        error "Main chaos runner failed"
        return 1
    fi
    
    info "Testing individual script help..."
    local scripts=("network-partition.sh" "service-failure.sh" "resource-exhaustion.sh")
    
    for script in "${scripts[@]}"; do
        if "$SCRIPTS_DIR/$script" --help > /dev/null 2>&1; then
            log "$script is working"
        else
            error "$script failed"
            return 1
        fi
    done
    
    # Test external-service-failure.sh (may require sudo)
    if sudo "$SCRIPTS_DIR/external-service-failure.sh" --help > /dev/null 2>&1; then
        log "external-service-failure.sh is working"
    else
        warn "external-service-failure.sh failed (may require sudo)"
    fi
    
    log "Quick test completed successfully"
    return 0
}

# Generate setup report
generate_report() {
    banner "GENERATING SETUP REPORT"
    
    local report_file="$SCRIPT_DIR/setup-verification-report.txt"
    
    cat > "$report_file" << EOF
Chaos Engineering Setup Verification Report
Generated: $(date)
System: $(uname -a)

=== SYSTEM INFORMATION ===
OS: $(uname -s)
Kernel: $(uname -r)
Architecture: $(uname -m)
Hostname: $(hostname)

=== AVAILABLE TOOLS ===
$(for tool in curl jq nc stress-ng python3 pgrep pkill iptables free df uptime bc; do
    if command -v "$tool" &> /dev/null; then
        echo "✓ $tool: $(command -v "$tool")"
    else
        echo "✗ $tool: NOT FOUND"
    fi
done)

=== PYTHON MODULES ===
$(for module in requests json http.server socketserver urllib; do
    if python3 -c "import $module" 2>/dev/null; then
        echo "✓ $module"
    else
        echo "✗ $module: NOT AVAILABLE"
    fi
done)

=== SYSTEM RESOURCES ===
CPU Cores: $(nproc)
Total Memory: $(free -m | awk 'NR==2{print $2}')MB
Available Memory: $(free -m | awk 'NR==2{print $7}')MB
CPU Load: $(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
Disk Usage: $(df -h / | awk 'NR==2{print $5}')

=== ENVIRONMENT VARIABLES ===
CHAOS_SAFE_MODE: ${CHAOS_SAFE_MODE:-"NOT SET"}
CHAOS_DURATION: ${CHAOS_DURATION:-"NOT SET"}
CHAOS_INTENSITY: ${CHAOS_INTENSITY:-"NOT SET"}
CHAOS_FAILURE_RATE: ${CHAOS_FAILURE_RATE:-"NOT SET"}

=== SCRIPT STATUS ===
$(for script in run-chaos.sh scripts/network-partition.sh scripts/service-failure.sh scripts/resource-exhaustion.sh scripts/external-service-failure.sh; do
    if [[ -f "$SCRIPT_DIR/$script" ]]; then
        if [[ -x "$SCRIPT_DIR/$script" ]]; then
            echo "✓ $script: EXISTS AND EXECUTABLE"
        else
            echo "⚠ $script: EXISTS BUT NOT EXECUTABLE"
        fi
    else
        echo "✗ $script: MISSING"
    fi
done)

=== RECOMMENDATIONS ===
$(if [[ "${CHAOS_SAFE_MODE:-}" != "1" ]]; then
    echo "- Set CHAOS_SAFE_MODE=1 before running experiments"
fi)
$(if ! command -v stress-ng &> /dev/null; then
    echo "- Install stress-ng for resource exhaustion experiments"
fi)
$(if ! pgrep -f "main.js" > /dev/null; then
    echo "- Start the backend service before running experiments"
fi)

=== NEXT STEPS ===
1. Review any warnings or errors above
2. Install missing dependencies if needed
3. Set environment variables (copy .env.example to .env)
4. Start backend service if not running
5. Run a test experiment: ./run-chaos.sh service-failure --duration 1

EOF
    
    log "Setup report saved to: $report_file"
    return 0
}

# Main execution
main() {
    banner "CHAOS ENGINEERING SETUP VERIFICATION"
    
    local checks_passed=0
    local total_checks=0
    
    # Run all checks
    local checks=(
        "check_tools"
        "check_python_deps"
        "check_scripts"
        "check_environment"
        "check_system_resources"
        "check_backend_service"
        "check_network_connectivity"
        "check_permissions"
        "run_quick_test"
    )
    
    for check in "${checks[@]}"; do
        ((total_checks++))
        if $check; then
            ((checks_passed++))
        fi
        echo
    done
    
    # Generate report
    generate_report
    
    # Summary
    banner "VERIFICATION SUMMARY"
    
    if [[ $checks_passed -eq $total_checks ]]; then
        log "All checks passed ($checks_passed/$total_checks)"
        log "Chaos engineering setup is ready!"
        echo
        echo "Quick start commands:"
        echo "  export CHAOS_SAFE_MODE=1"
        echo "  ./run-chaos.sh service-failure --duration 1"
        echo "  ./run-chaos.sh --status"
        echo
        return 0
    else
        error "Some checks failed ($checks_passed/$total_checks)"
        echo
        echo "Please review the issues above and:"
        echo "1. Install missing dependencies"
        echo "2. Fix configuration issues"
        echo "3. Start required services"
        echo "4. Run verification again"
        echo
        return 1
    fi
}

# Help function
show_help() {
    cat << EOF
Chaos Engineering Setup Verification

Usage: $0 [OPTIONS]

Options:
    --help              Show this help message
    --report-only       Generate setup report only
    --quick             Run quick verification only

This script verifies that all dependencies and configurations
are correctly set up for chaos engineering experiments.

It checks:
- Required tools and dependencies
- Script files and permissions
- Environment configuration
- System resources
- Backend service availability
- Network connectivity
- Permissions for system modifications

EOF
}

# Parse arguments
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    show_help
    exit 0
elif [[ "${1:-}" == "--report-only" ]]; then
    generate_report
    exit 0
elif [[ "${1:-}" == "--quick" ]]; then
    run_quick_test
    exit 0
fi

# Run main function
main "$@"