# =============================================================================
# VERIHOME DOCKER IMAGE - DJANGO + REACT FRONTEND
# =============================================================================
# Configurado por Agent D para desarrollo con Docker Compose

FROM python:3.9-slim

WORKDIR /app

# Install system dependencies including Node.js and netcat
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    netcat-traditional \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy frontend package files first (for Docker layer caching)
COPY frontend/package*.json ./frontend/

# Install Node.js dependencies
WORKDIR /app/frontend
RUN npm ci --production=false

# Copy frontend source code
COPY frontend/ .

# Build frontend - output goes to ../staticfiles/frontend
RUN npm run build

# Return to app directory and copy Django project files
WORKDIR /app
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/media /app/staticfiles

# Set proper permissions
RUN chmod +x /app/manage.py

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health/ || exit 1

# Default command (can be overridden by docker-compose)
CMD ["gunicorn", "verihome.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60"] 