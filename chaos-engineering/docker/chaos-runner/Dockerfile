FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    netcat-traditional \
    docker.io \
    iptables \
    iproute2 \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install Chaos Toolkit and extensions
RUN pip install --no-cache-dir \
    chaostoolkit \
    chaostoolkit-kubernetes \
    chaostoolkit-prometheus \
    chaostoolkit-slack \
    requests

# Create chaos user
RUN useradd -m -s /bin/bash chaos

# Set working directory
WORKDIR /chaos-engineering

# Copy chaos engineering scripts
COPY ../scripts /chaos-engineering/scripts
COPY ../chaostoolkit /chaos-engineering/chaostoolkit
COPY ../monitoring /chaos-engineering/monitoring
COPY ../safety /chaos-engineering/safety

# Make scripts executable
RUN chmod +x /chaos-engineering/scripts/*.sh
RUN chmod +x /chaos-engineering/safety/*.sh

# Create logs directory
RUN mkdir -p /chaos-engineering/logs /chaos-engineering/reports

# Set permissions
RUN chown -R chaos:chaos /chaos-engineering

# Switch to chaos user
USER chaos

# Set environment variables
ENV CHAOS_SCRIPTS_DIR=/chaos-engineering/scripts
ENV PYTHONPATH=/chaos-engineering

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Default command
CMD ["python", "-m", "http.server", "8080"]