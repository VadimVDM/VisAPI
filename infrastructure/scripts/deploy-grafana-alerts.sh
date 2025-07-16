#!/bin/bash

# =============================================================================
# GRAFANA CLOUD ALERT RULES DEPLOYMENT SCRIPT
# =============================================================================
# This script deploys the Grafana Cloud alert rules configuration using Terraform
# 
# Usage:
#   ./deploy-grafana-alerts.sh [environment]
#
# Arguments:
#   environment: production or staging (default: production)
#
# Prerequisites:
#   - Terraform installed
#   - terraform.tfvars configured with Grafana Cloud credentials
#   - Required environment variables set
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TERRAFORM_DIR="${PROJECT_ROOT}/infrastructure/terraform"
ENVIRONMENT="${1:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validation function
validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(production|staging)$ ]]; then
        log_error "Environment must be 'production' or 'staging'"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check terraform.tfvars
    if [[ ! -f "${TERRAFORM_DIR}/terraform.tfvars" ]]; then
        log_error "terraform.tfvars not found. Please create it from terraform.tfvars.example"
        exit 1
    fi
    
    # Check required variables
    required_vars=(
        "GRAFANA_CLOUD_API_KEY"
        "GRAFANA_CLOUD_STACK_ID"
        "GRAFANA_CLOUD_ORG_ID"
        "SLACK_WEBHOOK_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_warning "Environment variable $var is not set. Make sure it's configured in terraform.tfvars"
        fi
    done
    
    log_success "Prerequisites check completed"
}

# Backup existing state
backup_state() {
    log_info "Creating backup of Terraform state..."
    
    if [[ -f "${TERRAFORM_DIR}/terraform.tfstate" ]]; then
        cp "${TERRAFORM_DIR}/terraform.tfstate" "${TERRAFORM_DIR}/terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)"
        log_success "State backup created"
    else
        log_info "No existing state file found"
    fi
}

# Initialize Terraform
init_terraform() {
    log_info "Initializing Terraform..."
    
    cd "${TERRAFORM_DIR}"
    terraform init -upgrade
    
    log_success "Terraform initialized"
}

# Plan deployment
plan_deployment() {
    log_info "Planning Grafana Cloud alert rules deployment..."
    
    cd "${TERRAFORM_DIR}"
    terraform plan \
        -var="environment=${ENVIRONMENT}" \
        -target="module.grafana_cloud" \
        -out="grafana-alerts.tfplan"
    
    log_success "Terraform plan completed"
}

# Apply deployment
apply_deployment() {
    log_info "Applying Grafana Cloud alert rules deployment..."
    
    cd "${TERRAFORM_DIR}"
    terraform apply "grafana-alerts.tfplan"
    
    log_success "Grafana Cloud alert rules deployed successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    cd "${TERRAFORM_DIR}"
    terraform output monitoring_info
    
    log_success "Deployment verification completed"
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."
    
    cd "${TERRAFORM_DIR}"
    if [[ -f "grafana-alerts.tfplan" ]]; then
        rm "grafana-alerts.tfplan"
    fi
    
    log_success "Cleanup completed"
}

# Main execution
main() {
    log_info "Starting Grafana Cloud alert rules deployment for environment: ${ENVIRONMENT}"
    
    validate_environment
    check_prerequisites
    backup_state
    init_terraform
    plan_deployment
    
    # Confirm deployment
    echo
    log_warning "You are about to deploy Grafana Cloud alert rules to ${ENVIRONMENT}"
    read -p "Do you want to continue? (y/N): " -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        apply_deployment
        verify_deployment
        cleanup
        
        echo
        log_success "Grafana Cloud alert rules deployment completed successfully!"
        log_info "Check the Grafana Cloud UI to verify the alert rules are active"
        log_info "Test the alerts by triggering some conditions in the ${ENVIRONMENT} environment"
    else
        log_info "Deployment cancelled by user"
        cleanup
        exit 0
    fi
}

# Error handling
trap 'log_error "Script failed on line $LINENO"' ERR

# Run main function
main "$@"