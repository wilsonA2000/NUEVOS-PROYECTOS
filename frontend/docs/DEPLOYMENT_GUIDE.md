# VeriHome Deployment Guide

**Version:** 1.0.0  
**Last Updated:** 2024-01-01

## Table of Contents
1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Development Environment](#development-environment)
4. [Staging Environment](#staging-environment)
5. [Production Environment](#production-environment)
6. [Database Setup](#database-setup)
7. [Environment Variables](#environment-variables)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Monitoring & Health Checks](#monitoring--health-checks)
10. [Backup & Recovery](#backup--recovery)
11. [Troubleshooting](#troubleshooting)

---

## Overview

VeriHome is a modern real estate management platform consisting of:
- **Frontend**: React TypeScript application with Vite
- **Backend**: Django REST API (separate repository)
- **Database**: PostgreSQL with Redis for caching
- **File Storage**: AWS S3 or local storage
- **Deployment**: Docker containers with nginx

### Architecture Overview
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │────│   Backend   │────│  Database   │
│   (React)   │    │  (Django)   │    │(PostgreSQL) │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │            ┌─────────────┐
       │                   │────────────│    Redis    │
       │                   │            │  (Cache)    │
       │                   │            └─────────────┘
       │                   │
       │            ┌─────────────┐
       │────────────│  File Store │
       │            │   (S3/Local)│
       │            └─────────────┘
┌─────────────┐
│    nginx    │ (Reverse Proxy & Static Files)
└─────────────┘
```

---

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Docker

### Recommended Production Requirements
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Load Balancer**: nginx or AWS ALB

### Software Dependencies
- **Node.js**: 18.x or higher
- **Docker**: 20.10+ and Docker Compose 2.0+
- **Git**: Latest version
- **SSL Certificate**: Let's Encrypt or commercial

---

## Development Environment

### Quick Start with Docker

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local`:
   ```env
   # API Configuration
   VITE_API_URL=http://localhost:8000/api/v1
   VITE_APP_NAME=VeriHome
   VITE_APP_VERSION=1.0.0
   
   # Development Settings
   NODE_ENV=development
   VITE_DEBUG_MODE=true
   ```

3. **Docker Development Setup**
   ```bash
   # Build development image
   docker build -f Dockerfile.dev -t verihome-frontend-dev .
   
   # Run with hot reload
   docker run -p 3000:3000 -v $(pwd):/app verihome-frontend-dev
   ```

4. **Local Development Setup**
   ```bash
   # Install dependencies
   npm install
   
   # Start development server
   npm run dev
   
   # Run tests
   npm run test
   
   # Type checking
   npm run type-check
   ```

### Development Tools
- **Hot Reload**: Enabled by default with Vite
- **Code Quality**: ESLint + Prettier pre-configured
- **Testing**: Jest + React Testing Library
- **Type Checking**: TypeScript strict mode

---

## Staging Environment

### Docker Compose Setup

1. **Create docker-compose.staging.yml**
   ```yaml
   version: '3.8'
   
   services:
     frontend:
       build:
         context: .
         dockerfile: Dockerfile
       ports:
         - "3000:80"
       environment:
         - VITE_API_URL=https://api-staging.verihome.com/api/v1
         - NODE_ENV=production
       restart: unless-stopped
   
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.staging.conf:/etc/nginx/nginx.conf
         - ./ssl:/etc/ssl/certs
       depends_on:
         - frontend
       restart: unless-stopped
   ```

2. **nginx Staging Configuration**
   ```nginx
   server {
       listen 80;
       server_name staging.verihome.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name staging.verihome.com;
       
       ssl_certificate /etc/ssl/certs/staging.crt;
       ssl_certificate_key /etc/ssl/certs/staging.key;
       
       location / {
           proxy_pass http://frontend:80;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Deploy to Staging**
   ```bash
   # Build and deploy
   docker-compose -f docker-compose.staging.yml up -d --build
   
   # Check health
   curl -f https://staging.verihome.com/health || exit 1
   ```

### Staging Environment Variables
```env
# API Configuration
VITE_API_URL=https://api-staging.verihome.com/api/v1
VITE_APP_NAME=VeriHome Staging
NODE_ENV=production

# Analytics & Tracking
VITE_GOOGLE_ANALYTICS_ID=
VITE_SENTRY_DSN=https://your-sentry-dsn-staging

# Feature Flags
VITE_ENABLE_DEBUG_PANEL=true
VITE_ENABLE_MOCK_DATA=false
```

---

## Production Environment

### AWS EC2 Deployment

1. **Instance Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Security Setup**
   ```bash
   # Configure firewall
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw --force enable
   
   # Disable root login
   sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
   sudo systemctl restart ssh
   ```

3. **SSL Certificate with Let's Encrypt**
   ```bash
   # Install certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Get certificate
   sudo certbot --nginx -d verihome.com -d www.verihome.com
   
   # Auto-renewal
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Production Docker Compose

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NODE_ENV=production
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`verihome.com`)"
      - "traefik.http.routers.frontend.tls=true"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
      - ./logs:/var/log/nginx
    depends_on:
      - frontend
    restart: unless-stopped

  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300 --cleanup
    restart: unless-stopped
```

### Production nginx Configuration

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_comp_level 6;
    gzip_min_length 1000;
    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        text/xml
        application/xml
        application/xml+rss
        text/javascript
        application/x-javascript
        text/x-js;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name verihome.com www.verihome.com;
        return 301 https://$server_name$request_uri;
    }

    # Main server block
    server {
        listen 443 ssl http2;
        server_name verihome.com www.verihome.com;

        # SSL configuration
        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://frontend:80;
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Cache-Status $upstream_cache_status;
        }

        # API requests with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }

        # Login endpoint with stricter rate limiting
        location /api/auth/login/ {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Main application
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Handle SPA routing
            try_files $uri $uri/ @fallback;
        }

        location @fallback {
            proxy_pass http://frontend:80;
        }
    }
}
```

### Production Environment Variables

```env
# API Configuration
VITE_API_URL=https://api.verihome.com/api/v1
VITE_APP_NAME=VeriHome
NODE_ENV=production

# CDN & Assets
VITE_CDN_URL=https://cdn.verihome.com
VITE_STATIC_URL=https://static.verihome.com

# Analytics & Monitoring
VITE_GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
VITE_SENTRY_DSN=https://your-sentry-dsn-production
VITE_HOTJAR_ID=your-hotjar-id

# Security
VITE_CSP_REPORT_URI=https://api.verihome.com/csp-report/

# Feature Flags
VITE_ENABLE_DEBUG_PANEL=false
VITE_ENABLE_MOCK_DATA=false
VITE_MAINTENANCE_MODE=false
```

---

## Database Setup

While the frontend doesn't directly connect to the database, it's important to understand the backend database structure for integration.

### PostgreSQL Configuration

```sql
-- Database creation (run as postgres user)
CREATE DATABASE verihome_db;
CREATE USER verihome_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE verihome_db TO verihome_user;

-- For production, create read-only user for analytics
CREATE USER verihome_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE verihome_db TO verihome_readonly;
GRANT USAGE ON SCHEMA public TO verihome_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO verihome_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO verihome_readonly;
```

### Redis Configuration

```conf
# redis.conf
bind 127.0.0.1
port 6379
timeout 300
keepalive 60
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

---

## Environment Variables

### Complete Environment Variables Reference

```env
# ======================
# BUILD CONFIGURATION
# ======================
NODE_ENV=production
VITE_BUILD_TARGET=production

# ======================
# API CONFIGURATION
# ======================
VITE_API_URL=https://api.verihome.com/api/v1
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3

# ======================
# APPLICATION SETTINGS
# ======================
VITE_APP_NAME=VeriHome
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Modern Real Estate Management Platform
VITE_APP_KEYWORDS=real estate, property management, rental

# ======================
# EXTERNAL SERVICES
# ======================
# Maps
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Analytics
VITE_GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
VITE_FACEBOOK_PIXEL_ID=your_facebook_pixel_id
VITE_HOTJAR_ID=your_hotjar_id

# Error Tracking
VITE_SENTRY_DSN=https://your-sentry-dsn
VITE_SENTRY_ENVIRONMENT=production

# Payment Processing
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_key
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id

# ======================
# CDN & ASSETS
# ======================
VITE_CDN_URL=https://cdn.verihome.com
VITE_STATIC_URL=https://static.verihome.com
VITE_MEDIA_URL=https://media.verihome.com

# ======================
# SECURITY
# ======================
VITE_CSP_REPORT_URI=https://api.verihome.com/csp-report/
VITE_ALLOWED_ORIGINS=https://verihome.com,https://www.verihome.com

# ======================
# FEATURE FLAGS
# ======================
VITE_ENABLE_PWA=true
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_PUSH_NOTIFICATIONS=true
VITE_ENABLE_BIOMETRIC_AUTH=true
VITE_ENABLE_CHAT_FEATURE=true
VITE_ENABLE_ADVANCED_SEARCH=true
VITE_ENABLE_VIRTUAL_TOURS=true

# Development/Debug Features
VITE_ENABLE_DEBUG_PANEL=false
VITE_ENABLE_MOCK_DATA=false
VITE_ENABLE_PERFORMANCE_MONITORING=true

# ======================
# PERFORMANCE
# ======================
VITE_BUNDLE_ANALYZER=false
VITE_ENABLE_CODE_SPLITTING=true
VITE_ENABLE_LAZY_LOADING=true
VITE_IMAGE_OPTIMIZATION=true

# ======================
# LOCALIZATION
# ======================
VITE_DEFAULT_LANGUAGE=en
VITE_SUPPORTED_LANGUAGES=en,es,fr
VITE_ENABLE_RTL=false

# ======================
# COMMUNICATION
# ======================
VITE_SUPPORT_EMAIL=support@verihome.com
VITE_SUPPORT_PHONE=+1-555-0123
VITE_COMPANY_ADDRESS=123 Business St, City, State 12345
```

### Environment-Specific Configurations

#### Development (.env.development)
```env
NODE_ENV=development
VITE_API_URL=http://localhost:8000/api/v1
VITE_ENABLE_DEBUG_PANEL=true
VITE_ENABLE_MOCK_DATA=true
VITE_SENTRY_DSN=""
VITE_GOOGLE_ANALYTICS_ID=""
```

#### Testing (.env.test)
```env
NODE_ENV=test
VITE_API_URL=http://localhost:8000/api/v1
VITE_ENABLE_MOCK_DATA=true
VITE_ENABLE_DEBUG_PANEL=false
```

#### Staging (.env.staging)
```env
NODE_ENV=production
VITE_API_URL=https://api-staging.verihome.com/api/v1
VITE_SENTRY_DSN=https://your-sentry-dsn-staging
VITE_GOOGLE_ANALYTICS_ID=GA_STAGING_ID
VITE_ENABLE_DEBUG_PANEL=true
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy VeriHome Frontend

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18.x'
  REGISTRY: ghcr.io
  IMAGE_NAME: verihome/frontend

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment"
          # Add your staging deployment commands here

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production environment"
          # Add your production deployment commands here
```

### GitLab CI/CD Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

cache:
  paths:
    - node_modules/

test:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run lint
    - npm run type-check
    - npm run test:coverage
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

security_scan:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm audit --audit-level moderate
    - npx snyk test

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy_staging:
  stage: deploy
  image: alpine:latest
  environment:
    name: staging
    url: https://staging.verihome.com
  script:
    - echo "Deploy to staging"
  only:
    - develop

deploy_production:
  stage: deploy
  image: alpine:latest
  environment:
    name: production
    url: https://verihome.com
  script:
    - echo "Deploy to production"
  only:
    - main
  when: manual
```

---

## Monitoring & Health Checks

### Application Health Checks

```typescript
// src/utils/healthCheck.ts
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    api: boolean;
    database: boolean;
    cache: boolean;
  };
  timestamp: string;
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const checks = {
    api: await checkApiHealth(),
    database: await checkDatabaseHealth(),
    cache: await checkCacheHealth(),
  };

  const allHealthy = Object.values(checks).every(check => check);
  const someHealthy = Object.values(checks).some(check => check);

  return {
    status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  };
}
```

### Docker Health Check

```dockerfile
# Add to Dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1
```

### Monitoring with Prometheus

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources

volumes:
  grafana-storage:
```

### Logging with ELK Stack

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - es-data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:7.14.0
    volumes:
      - ./logstash/config:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:7.14.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  es-data:
```

---

## Backup & Recovery

### Database Backup Script

```bash
#!/bin/bash
# backup.sh

# Configuration
DB_NAME="verihome_db"
DB_USER="verihome_user"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/verihome_backup_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove backups older than 30 days
find $BACKUP_DIR -name "verihome_backup_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
if [ ! -z "$AWS_S3_BUCKET" ]; then
    aws s3 cp "${BACKUP_FILE}.gz" "s3://${AWS_S3_BUCKET}/backups/"
fi

echo "Backup completed: ${BACKUP_FILE}.gz"
```

### Automated Backup with Cron

```bash
# Add to crontab (crontab -e)
# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1

# Weekly full system backup at 3 AM on Sundays
0 3 * * 0 /path/to/full_backup.sh >> /var/log/backup.log 2>&1
```

### Disaster Recovery Plan

1. **Database Recovery**
   ```bash
   # Stop application
   docker-compose down
   
   # Restore database
   gunzip -c backup_file.sql.gz | psql -h localhost -U verihome_user -d verihome_db
   
   # Restart application
   docker-compose up -d
   ```

2. **Application Recovery**
   ```bash
   # Pull latest images
   docker-compose pull
   
   # Restart with new configuration
   docker-compose up -d --force-recreate
   ```

3. **Full System Recovery**
   ```bash
   # Restore from infrastructure backup
   terraform apply -auto-approve
   
   # Deploy application
   docker-compose -f docker-compose.prod.yml up -d
   
   # Restore data
   ./restore_data.sh
   ```

---

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Issue**: TypeScript compilation errors
```bash
# Check TypeScript configuration
npm run type-check

# Fix common issues
npm run lint:fix
```

**Issue**: Memory issues during build
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

#### 2. Runtime Issues

**Issue**: API connection failures
```bash
# Check network connectivity
curl -I $VITE_API_URL/health

# Verify environment variables
printenv | grep VITE_
```

**Issue**: Authentication problems
```bash
# Clear browser storage
localStorage.clear()
sessionStorage.clear()

# Check JWT token validity
jwt-decode $TOKEN
```

#### 3. Performance Issues

**Issue**: Slow loading times
```bash
# Analyze bundle size
npm run build -- --analyze

# Check for large dependencies
npx webpack-bundle-analyzer dist/stats.json
```

**Issue**: Memory leaks
```bash
# Enable performance monitoring
VITE_ENABLE_PERFORMANCE_MONITORING=true npm run dev
```

### Debugging Tools

#### Application Logs
```bash
# Docker logs
docker-compose logs -f frontend

# nginx logs
docker-compose exec nginx tail -f /var/log/nginx/access.log
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

#### Network Debugging
```bash
# Check DNS resolution
nslookup api.verihome.com

# Test API connectivity
curl -v -H "Authorization: Bearer $TOKEN" $VITE_API_URL/properties/

# Check SSL certificate
openssl s_client -connect verihome.com:443 -servername verihome.com
```

#### Performance Profiling
```bash
# Lighthouse audit
npx lighthouse https://verihome.com --output html --output-path ./audit-report.html

# Bundle analysis
npx vite-bundle-analyzer dist
```

### Emergency Procedures

#### 1. Application Down
```bash
# Quick restart
docker-compose restart frontend

# Rollback to previous version
docker-compose down
docker-compose up -d --scale frontend=0
docker tag verihome-frontend:previous verihome-frontend:latest
docker-compose up -d
```

#### 2. Database Issues
```bash
# Switch to read-only mode
docker-compose exec nginx nginx -s reload

# Enable maintenance mode
export VITE_MAINTENANCE_MODE=true
docker-compose up -d --force-recreate frontend
```

#### 3. Security Incident
```bash
# Immediate response
docker-compose down
docker network disconnect bridge $(docker ps -aq)

# Rotate secrets
kubectl delete secret api-secrets
kubectl create secret generic api-secrets --from-env-file=.env.secure

# Update firewall rules
sudo ufw deny from $SUSPICIOUS_IP
```

---

## Performance Optimization

### Build Optimization

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { splitVendorChunkPlugin } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          utils: ['axios', 'date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 3000,
    host: true,
    hmr: {
      port: 3001,
    },
  },
})
```

### Runtime Optimization

```typescript
// src/utils/performanceOptimization.ts
import { lazy } from 'react'

// Code splitting for routes
export const PropertyList = lazy(() => import('../pages/properties/PropertyList'))
export const Dashboard = lazy(() => import('../pages/Dashboard'))

// Image optimization
export const optimizeImage = (url: string, width?: number, height?: number) => {
  const params = new URLSearchParams()
  if (width) params.set('w', width.toString())
  if (height) params.set('h', height.toString())
  params.set('f', 'webp')
  params.set('q', '80')
  
  return `${import.meta.env.VITE_CDN_URL}/optimize?url=${encodeURIComponent(url)}&${params}`
}

// Service Worker for caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js')
}
```

---

## Security Considerations

### Content Security Policy

```nginx
# Add to nginx configuration
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google-analytics.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    connect-src 'self' https://api.verihome.com wss://api.verihome.com;
    frame-src 'none';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
" always;
```

### Security Headers

```nginx
# Security headers
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

### Environment Security

```bash
# Secure environment file permissions
chmod 600 .env.production
chown root:root .env.production

# Use secrets management
kubectl create secret generic frontend-secrets \
  --from-literal=api-url="$VITE_API_URL" \
  --from-literal=analytics-id="$VITE_GOOGLE_ANALYTICS_ID"
```

---

**Last Updated**: 2024-01-01  
**Contact**: DevOps Team <devops@verihome.com>  
**Emergency Contact**: +1-555-0199 (24/7 Support)

---

*This deployment guide is a living document. Please keep it updated with any changes to the deployment process or infrastructure.*