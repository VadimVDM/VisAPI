# Use multi-stage build with Alpine for minimal attack surface
FROM python:3.12-alpine as builder

# Install build dependencies in builder stage
RUN apk add --no-cache \
    build-base \
    libffi-dev \
    openssl-dev \
    curl

# Install Python packages with pinned versions
RUN pip install --no-cache-dir --user \
    chaostoolkit==1.21.0 \
    chaostoolkit-kubernetes==0.28.0 \
    chaostoolkit-prometheus==0.4.0 \
    chaostoolkit-slack==0.5.0 \
    requests==2.31.0

# Use minimal Alpine runtime for final stage
FROM python:3.12-alpine

# Install only runtime dependencies
RUN apk add --no-cache \
    libffi \
    openssl \
    ca-certificates \
    && adduser -D -s /bin/false chaos

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application files
COPY --chown=chaos:chaos ../scripts /chaos-engineering/scripts
COPY --chown=chaos:chaos ../chaostoolkit /chaos-engineering/chaostoolkit
COPY --chown=chaos:chaos ../monitoring /chaos-engineering/monitoring
COPY --chown=chaos:chaos ../safety /chaos-engineering/safety

# Set working directory
WORKDIR /chaos-engineering

# Create logs and reports directories
RUN mkdir -p /chaos-engineering/logs /chaos-engineering/reports && \
    chown -R chaos:chaos /chaos-engineering

# Set Python path for packages
ENV PYTHONPATH=/root/.local/lib/python3.12/site-packages:/chaos-engineering
ENV PATH=/root/.local/bin:$PATH
ENV CHAOS_SCRIPTS_DIR=/chaos-engineering/scripts

# Use chaos user (no shell access)
USER chaos

# Default command - run chaos toolkit directly
CMD ["python", "-m", "chaostoolkit", "info"]