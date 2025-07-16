#!/bin/bash

# Security scanning script for chaos-runner Docker image
set -euo pipefail

IMAGE_NAME="chaos-runner:latest"
REPORT_DIR="./security-reports"
DOCKERFILE_PATH="./Dockerfile"

# Create reports directory
mkdir -p "$REPORT_DIR"

echo "🔍 Starting security scan for $IMAGE_NAME"

# Build the image
echo "📦 Building Docker image..."
docker build -t "$IMAGE_NAME" .

# Generate SBOM (Software Bill of Materials)
echo "📋 Generating SBOM..."
if command -v syft &> /dev/null; then
    syft "$IMAGE_NAME" -o spdx-json > "$REPORT_DIR/sbom.json"
    echo "✅ SBOM generated at $REPORT_DIR/sbom.json"
else
    echo "⚠️  Syft not found. Install with: curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin"
fi

# Vulnerability scanning with Grype
echo "🔍 Scanning for vulnerabilities..."
if command -v grype &> /dev/null; then
    grype "$IMAGE_NAME" -o json > "$REPORT_DIR/vulnerabilities.json"
    grype "$IMAGE_NAME" -o table > "$REPORT_DIR/vulnerabilities.txt"
    echo "✅ Vulnerability scan completed at $REPORT_DIR/vulnerabilities.*"
else
    echo "⚠️  Grype not found. Install with: curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin"
fi

# Dockerfile security scan with Hadolint
echo "🔍 Scanning Dockerfile for security issues..."
if command -v hadolint &> /dev/null; then
    hadolint "$DOCKERFILE_PATH" > "$REPORT_DIR/dockerfile-security.txt" || true
    echo "✅ Dockerfile security scan completed at $REPORT_DIR/dockerfile-security.txt"
else
    echo "⚠️  Hadolint not found. Install with: docker pull hadolint/hadolint"
fi

# Docker Bench Security (if available)
echo "🔍 Running Docker Bench Security..."
if [ -d "/opt/docker-bench-security" ]; then
    cd /opt/docker-bench-security && ./docker-bench-security.sh > "$REPORT_DIR/docker-bench.txt"
    echo "✅ Docker Bench Security completed at $REPORT_DIR/docker-bench.txt"
else
    echo "⚠️  Docker Bench Security not found. Clone from: https://github.com/docker/docker-bench-security"
fi

# Summary
echo "🎉 Security scan completed!"
echo "📊 Reports generated in: $REPORT_DIR"
echo "   - SBOM: sbom.json"
echo "   - Vulnerabilities: vulnerabilities.json/txt"
echo "   - Dockerfile Security: dockerfile-security.txt"
echo "   - Docker Bench: docker-bench.txt"

# Check for critical vulnerabilities
if [ -f "$REPORT_DIR/vulnerabilities.json" ]; then
    CRITICAL_COUNT=$(jq '.matches[] | select(.vulnerability.severity == "Critical") | length' "$REPORT_DIR/vulnerabilities.json" | wc -l)
    if [ "$CRITICAL_COUNT" -gt 0 ]; then
        echo "⚠️  WARNING: $CRITICAL_COUNT critical vulnerabilities found!"
        exit 1
    else
        echo "✅ No critical vulnerabilities found"
    fi
fi