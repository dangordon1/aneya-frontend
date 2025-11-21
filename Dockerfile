# Multi-stage build for aneya backend on Google Cloud Run
FROM --platform=linux/amd64 python:3.12-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libxml2-dev \
    libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY api.py .
COPY servers/ ./servers/

# Create a non-root user
RUN useradd -m -u 1000 aneya && chown -R aneya:aneya /app
USER aneya

# Expose port 8080
EXPOSE 8080

# Run the application with uvicorn on port 8080
# Cloud Run will override via PORT env var, Railway uses fixed port
CMD uvicorn api:app --host 0.0.0.0 --port 8080 --log-level info
