#!/bin/bash

# External Service Failure Chaos Script
# Simulates external service failures (Slack, WhatsApp, etc.) returning 500s
# Tests retry mechanisms and fallback behavior
# Usage: ./external-service-failure.sh [duration_minutes] [service_type] [failure_rate]

set -euo pipefail

# Configuration
DURATION_MINUTES="${1:-10}"
SERVICE_TYPE="${2:-slack}"    # slack, whatsapp, email, webhook, all
FAILURE_RATE="${3:-50}"       # Percentage of requests to fail (0-100)
LOG_FILE="/tmp/external-service-failure-chaos.log"
METRICS_FILE="/tmp/external-service-failure-metrics.json"
PROXY_PORT=8888
PROXY_PID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service endpoints to intercept
declare -A SERVICE_ENDPOINTS=(
    ["slack"]="hooks.slack.com|slack.com/api"
    ["whatsapp"]="cgbapi.co|whatsapp.com/api"
    ["email"]="api.resend.com|sendgrid.com/api"
    ["webhook"]="hooks.zapier.com|webhook.site"
)

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
    for tool in python3 curl jq nc; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is not available. Please install it."
            exit 1
        fi
    done
    
    # Check if Python requests module is available
    if ! python3 -c "import requests, http.server, socketserver, urllib.parse" 2>/dev/null; then
        error "Python requests module is not available. Install with: pip3 install requests"
        exit 1
    fi
    
    # Check if port is available
    if nc -z localhost "$PROXY_PORT" 2>/dev/null; then
        error "Port $PROXY_PORT is already in use. Please choose a different port."
        exit 1
    fi
    
    # Check if backend service is running
    if ! pgrep -f "main.js" > /dev/null; then
        warn "Backend service doesn't appear to be running"
    else
        log "Backend service is running"
    fi
}

# Create chaos proxy server
create_chaos_proxy() {
    local service_type="$1"
    local failure_rate="$2"
    
    log "Creating chaos proxy server for $service_type with ${failure_rate}% failure rate"
    
    # Create Python proxy script
    cat > /tmp/chaos-proxy.py << EOF
#!/usr/bin/env python3

import http.server
import socketserver
import urllib.parse
import urllib.request
import json
import random
import time
import re
from datetime import datetime

class ChaosProxyHandler(http.server.BaseHTTPRequestHandler):
    def __init__(self, *args, service_type="$service_type", failure_rate=$failure_rate, **kwargs):
        self.service_type = service_type
        self.failure_rate = failure_rate
        self.service_patterns = {
            'slack': r'(hooks\.slack\.com|slack\.com/api)',
            'whatsapp': r'(cgbapi\.co|whatsapp\.com/api)',
            'email': r'(api\.resend\.com|sendgrid\.com/api)',
            'webhook': r'(hooks\.zapier\.com|webhook\.site)',
            'all': r'(hooks\.slack\.com|slack\.com/api|cgbapi\.co|whatsapp\.com/api|api\.resend\.com|sendgrid\.com/api|hooks\.zapier\.com|webhook\.site)'
        }
        self.request_count = 0
        self.failure_count = 0
        super().__init__(*args, **kwargs)
    
    def log_message(self, format, *args):
        # Redirect server logs to our log file
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        message = f"[{timestamp}] PROXY: {format % args}"
        print(message)
        with open("$LOG_FILE", "a") as f:
            f.write(message + "\\n")
    
    def should_fail_request(self, url):
        # Check if URL matches our service pattern
        pattern = self.service_patterns.get(self.service_type, '')
        if not pattern:
            return False
        
        if not re.search(pattern, url):
            return False
        
        # Apply failure rate
        return random.randint(1, 100) <= self.failure_rate
    
    def get_failure_response(self, url):
        failures = [
            (500, "Internal Server Error"),
            (502, "Bad Gateway"),
            (503, "Service Unavailable"),
            (504, "Gateway Timeout"),
            (429, "Too Many Requests")
        ]
        
        status_code, status_message = random.choice(failures)
        
        # Simulate different error responses
        if 'slack' in url:
            error_response = {
                "ok": False,
                "error": "internal_error",
                "message": "Chaos engineering simulation"
            }
        elif 'whatsapp' in url or 'cgbapi' in url:
            error_response = {
                "success": False,
                "error": "server_error",
                "message": "Service temporarily unavailable"
            }
        elif 'resend' in url or 'sendgrid' in url:
            error_response = {
                "message": "Internal server error",
                "name": "internal_server_error"
            }
        else:
            error_response = {
                "error": "service_unavailable",
                "message": "Service is temporarily unavailable"
            }
        
        return status_code, json.dumps(error_response)
    
    def handle_request(self):
        self.request_count += 1
        
        # Parse the request URL
        url = f"http://{self.headers.get('Host', 'localhost')}{self.path}"
        
        # Check if we should fail this request
        if self.should_fail_request(url):
            self.failure_count += 1
            status_code, error_response = self.get_failure_response(url)
            
            # Add random delay to simulate timeout
            delay = random.uniform(0.1, 2.0)
            time.sleep(delay)
            
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(error_response.encode())
            
            self.log_message(f"FAILED request #{self.request_count}: {self.command} {url} -> {status_code}")
            return
        
        # Forward the request normally
        try:
            # Create the request
            req = urllib.request.Request(url, 
                                       data=self.rfile.read(int(self.headers.get('Content-Length', 0))) if self.command == 'POST' else None,
                                       headers=dict(self.headers))
            req.get_method = lambda: self.command
            
            # Make the request
            with urllib.request.urlopen(req) as response:
                self.send_response(response.status)
                for header, value in response.headers.items():
                    if header.lower() not in ['connection', 'transfer-encoding']:
                        self.send_header(header, value)
                self.end_headers()
                self.wfile.write(response.read())
            
            self.log_message(f"FORWARDED request #{self.request_count}: {self.command} {url} -> {response.status}")
        
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = {"error": "proxy_error", "message": str(e)}
            self.wfile.write(json.dumps(error_response).encode())
            
            self.log_message(f"PROXY ERROR request #{self.request_count}: {self.command} {url} -> {str(e)}")
    
    def do_GET(self):
        self.handle_request()
    
    def do_POST(self):
        self.handle_request()
    
    def do_PUT(self):
        self.handle_request()
    
    def do_DELETE(self):
        self.handle_request()

if __name__ == "__main__":
    PORT = $PROXY_PORT
    
    with socketserver.TCPServer(("", PORT), ChaosProxyHandler) as httpd:
        print(f"Chaos proxy server running on port {PORT}")
        print(f"Service type: $service_type")
        print(f"Failure rate: ${failure_rate}%")
        httpd.serve_forever()
EOF
    
    # Start the proxy server
    python3 /tmp/chaos-proxy.py &
    PROXY_PID=$!
    
    # Wait for proxy to start
    sleep 2
    
    # Verify proxy is running
    if ! nc -z localhost "$PROXY_PORT" 2>/dev/null; then
        error "Failed to start chaos proxy server"
        exit 1
    fi
    
    log "Chaos proxy server started with PID $PROXY_PID on port $PROXY_PORT"
}

# Configure system to use chaos proxy
configure_proxy() {
    local service_type="$1"
    
    log "Configuring system to use chaos proxy for $service_type services"
    
    # Create hosts file backup
    cp /etc/hosts /etc/hosts.chaos-backup
    
    # Add entries to redirect services through our proxy
    case "$service_type" in
        "slack")
            echo "127.0.0.1 hooks.slack.com" >> /etc/hosts
            echo "127.0.0.1 slack.com" >> /etc/hosts
            ;;
        "whatsapp")
            echo "127.0.0.1 cgbapi.co" >> /etc/hosts
            echo "127.0.0.1 whatsapp.com" >> /etc/hosts
            ;;
        "email")
            echo "127.0.0.1 api.resend.com" >> /etc/hosts
            echo "127.0.0.1 sendgrid.com" >> /etc/hosts
            ;;
        "webhook")
            echo "127.0.0.1 hooks.zapier.com" >> /etc/hosts
            echo "127.0.0.1 webhook.site" >> /etc/hosts
            ;;
        "all")
            echo "127.0.0.1 hooks.slack.com" >> /etc/hosts
            echo "127.0.0.1 slack.com" >> /etc/hosts
            echo "127.0.0.1 cgbapi.co" >> /etc/hosts
            echo "127.0.0.1 whatsapp.com" >> /etc/hosts
            echo "127.0.0.1 api.resend.com" >> /etc/hosts
            echo "127.0.0.1 sendgrid.com" >> /etc/hosts
            echo "127.0.0.1 hooks.zapier.com" >> /etc/hosts
            echo "127.0.0.1 webhook.site" >> /etc/hosts
            ;;
    esac
    
    log "Hosts file configured for chaos proxy"
}

# Restore original hosts configuration
restore_hosts() {
    if [[ -f /etc/hosts.chaos-backup ]]; then
        log "Restoring original hosts file"
        mv /etc/hosts.chaos-backup /etc/hosts
    fi
}

# Trigger test requests to external services
trigger_test_requests() {
    log "Triggering test requests to external services"
    
    # Create test workflow that calls external services
    local workflow_payload='{
        "name": "chaos-test-workflow",
        "steps": [
            {
                "type": "slack.send",
                "config": {
                    "webhook_url": "https://hooks.slack.com/services/test",
                    "message": "Chaos engineering test"
                }
            },
            {
                "type": "whatsapp.send",
                "config": {
                    "phone": "+1234567890",
                    "message": "Chaos test"
                }
            },
            {
                "type": "email.send",
                "config": {
                    "to": "test@example.com",
                    "subject": "Chaos test",
                    "body": "Testing external service failures"
                }
            }
        ]
    }'
    
    # Trigger the workflow
    curl -s -X POST "http://localhost:3000/api/v1/workflows" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: test-key" \
        -d "$workflow_payload" > /dev/null || true
    
    # Trigger individual webhook calls
    curl -s -X POST "http://localhost:3000/api/v1/triggers/test-webhook" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: test-key" \
        -d '{"test": "chaos"}' > /dev/null || true
}

# Monitor external service behavior
monitor_external_services() {
    local duration=$1
    local start_time=$(date +%s)
    local end_time=$((start_time + duration * 60))
    
    log "Starting external service monitoring for $duration minutes..."
    
    # Initialize metrics
    cat > "$METRICS_FILE" << EOF
{
    "experiment": "external-service-failure",
    "service_type": "$SERVICE_TYPE",
    "failure_rate": $FAILURE_RATE,
    "proxy_port": $PROXY_PORT,
    "start_time": "$start_time",
    "duration_minutes": $duration,
    "metrics": []
}
EOF
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        # Check backend service health
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
        local failed_jobs="null"
        local completed_jobs="null"
        if curl -s "http://localhost:3000/api/v1/queue/metrics" | jq -e '.waiting' &>/dev/null; then
            queue_depth=$(curl -s "http://localhost:3000/api/v1/queue/metrics" | jq -r '.waiting' || echo "null")
            failed_jobs=$(curl -s "http://localhost:3000/api/v1/queue/metrics" | jq -r '.failed' || echo "null")
            completed_jobs=$(curl -s "http://localhost:3000/api/v1/queue/metrics" | jq -r '.completed' || echo "null")
        fi
        
        # Check proxy status
        local proxy_status="unknown"
        if [[ -n "$PROXY_PID" ]] && kill -0 "$PROXY_PID" 2>/dev/null; then
            proxy_status="running"
        else
            proxy_status="stopped"
        fi
        
        # Test external service connectivity
        local external_tests={}
        
        # Test Slack
        local slack_status="unknown"
        if curl -s -m 5 "http://localhost:$PROXY_PORT" -H "Host: hooks.slack.com" > /dev/null 2>&1; then
            slack_status="reachable"
        else
            slack_status="unreachable"
        fi
        
        # Test WhatsApp
        local whatsapp_status="unknown"
        if curl -s -m 5 "http://localhost:$PROXY_PORT" -H "Host: cgbapi.co" > /dev/null 2>&1; then
            whatsapp_status="reachable"
        else
            whatsapp_status="unreachable"
        fi
        
        # Count processes
        local process_count=$(pgrep -f "main.js" | wc -l)
        
        # Record metrics
        local metric_entry=$(cat << EOF
{
    "timestamp": $current_time,
    "elapsed_seconds": $elapsed,
    "service_status": "$service_status",
    "service_response_time": $response_time,
    "queue_depth": $queue_depth,
    "failed_jobs": $failed_jobs,
    "completed_jobs": $completed_jobs,
    "proxy_status": "$proxy_status",
    "process_count": $process_count,
    "external_services": {
        "slack": "$slack_status",
        "whatsapp": "$whatsapp_status"
    }
}
EOF
)
        
        # Append to metrics file
        jq --argjson metric "$metric_entry" '.metrics += [$metric]' "$METRICS_FILE" > "${METRICS_FILE}.tmp" && mv "${METRICS_FILE}.tmp" "$METRICS_FILE"
        
        info "Status: Service=$service_status, Queue=$queue_depth, Proxy=$proxy_status, Failed=$failed_jobs"
        
        # Periodically trigger test requests
        if [[ $((elapsed % 30)) -eq 0 ]]; then
            trigger_test_requests
        fi
        
        sleep 10
    done
    
    # Finalize metrics
    jq --arg end_time "$(date +%s)" '.end_time = $end_time' "$METRICS_FILE" > "${METRICS_FILE}.tmp" && mv "${METRICS_FILE}.tmp" "$METRICS_FILE"
    
    log "External service monitoring completed"
}

# Stop chaos proxy
stop_proxy() {
    if [[ -n "$PROXY_PID" ]] && kill -0 "$PROXY_PID" 2>/dev/null; then
        log "Stopping chaos proxy server (PID: $PROXY_PID)"
        kill -TERM "$PROXY_PID" 2>/dev/null || true
        
        # Wait for graceful shutdown
        sleep 2
        
        # Force kill if still running
        if kill -0 "$PROXY_PID" 2>/dev/null; then
            kill -KILL "$PROXY_PID" 2>/dev/null || true
        fi
        
        log "Chaos proxy server stopped"
    fi
    
    # Clean up proxy script
    rm -f /tmp/chaos-proxy.py
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    stop_proxy
    restore_hosts
    
    # Kill any monitoring processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    log "Cleanup completed"
}

# Check if running as root (needed for hosts file modification)
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root for hosts file modification"
        echo "Please run: sudo $0 $@"
        exit 1
    fi
}

# Signal handlers
trap cleanup EXIT
trap cleanup SIGINT
trap cleanup SIGTERM

# Main execution
main() {
    log "Starting External Service Failure Chaos Experiment"
    log "Duration: $DURATION_MINUTES minutes"
    log "Service Type: $SERVICE_TYPE"
    log "Failure Rate: ${FAILURE_RATE}%"
    log "Proxy Port: $PROXY_PORT"
    log "Log file: $LOG_FILE"
    log "Metrics file: $METRICS_FILE"
    
    check_root
    preflight_checks
    
    # Create and start chaos proxy
    create_chaos_proxy "$SERVICE_TYPE" "$FAILURE_RATE"
    
    # Configure system to use proxy
    configure_proxy "$SERVICE_TYPE"
    
    # Start monitoring
    monitor_external_services "$DURATION_MINUTES"
    
    log "External Service Failure Chaos Experiment completed"
    log "Metrics saved to: $METRICS_FILE"
    log "Logs saved to: $LOG_FILE"
    
    # Display summary
    echo
    echo "=== EXPERIMENT SUMMARY ==="
    echo "Duration: $DURATION_MINUTES minutes"
    echo "Service Type: $SERVICE_TYPE"
    echo "Failure Rate: ${FAILURE_RATE}%"
    echo "Proxy Port: $PROXY_PORT"
    echo "Metrics: $METRICS_FILE"
    echo "Logs: $LOG_FILE"
    echo
    
    # Show final metrics
    if [[ -f "$METRICS_FILE" ]]; then
        echo "Final metrics:"
        local service_healthy_count=$(jq -r '.metrics | map(select(.service_status == "healthy")) | length' "$METRICS_FILE")
        local total_metrics=$(jq -r '.metrics | length' "$METRICS_FILE")
        local final_failed_jobs=$(jq -r '.metrics[-1].failed_jobs' "$METRICS_FILE")
        local final_completed_jobs=$(jq -r '.metrics[-1].completed_jobs' "$METRICS_FILE")
        
        echo "Service healthy: $service_healthy_count/$total_metrics samples"
        echo "Failed jobs: $final_failed_jobs"
        echo "Completed jobs: $final_completed_jobs"
        
        jq -r '.metrics[-1] | "Final status: Service=\(.service_status), Queue=\(.queue_depth), Proxy=\(.proxy_status)"' "$METRICS_FILE"
    fi
}

# Help function
show_help() {
    cat << EOF
External Service Failure Chaos Script

Usage: $0 [duration_minutes] [service_type] [failure_rate]

Arguments:
    duration_minutes    Duration to run chaos experiment (default: 10)
    service_type        Type of external service to simulate failures for (default: slack)
                       Options: slack, whatsapp, email, webhook, all
    failure_rate        Percentage of requests to fail (default: 50)
                       Range: 0-100

Examples:
    $0                      # 10 minutes of 50% Slack failures
    $0 15 whatsapp 75      # 15 minutes of 75% WhatsApp failures
    $0 5 all 25            # 5 minutes of 25% failures for all services
    $0 20 email 100        # 20 minutes of 100% email failures

Service Types:
    slack       - Slack webhook and API failures
    whatsapp    - WhatsApp/CGB API failures
    email       - Email service (Resend, SendGrid) failures
    webhook     - Generic webhook failures
    all         - All external service failures

This script:
- Creates a chaos proxy server to intercept external service calls
- Simulates various HTTP error responses (500, 502, 503, 504, 429)
- Monitors system behavior during external service outages
- Tests retry mechanisms and error handling
- Collects metrics on service health and job processing

Requirements:
- Must be run as root (for hosts file modification)
- Python 3 with requests module
- Backend service should be running
- curl, jq, nc must be installed

EOF
}

# Validate arguments
validate_args() {
    if ! [[ "$DURATION_MINUTES" =~ ^[0-9]+$ ]]; then
        error "Duration must be a positive integer"
        exit 1
    fi
    
    if ! [[ "$SERVICE_TYPE" =~ ^(slack|whatsapp|email|webhook|all)$ ]]; then
        error "Service type must be one of: slack, whatsapp, email, webhook, all"
        exit 1
    fi
    
    if ! [[ "$FAILURE_RATE" =~ ^[0-9]+$ ]] || [[ "$FAILURE_RATE" -lt 0 ]] || [[ "$FAILURE_RATE" -gt 100 ]]; then
        error "Failure rate must be an integer between 0 and 100"
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