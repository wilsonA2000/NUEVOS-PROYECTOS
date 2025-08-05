# VeriHome Troubleshooting Guide

**Version**: 1.0.0  
**Last Updated**: 2024-01-01  
**Target Audience**: Developers, DevOps, Support Team

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Common Issues](#common-issues)
3. [Frontend Issues](#frontend-issues)
4. [API and Backend Issues](#api-and-backend-issues)
5. [Database Issues](#database-issues)
6. [Performance Issues](#performance-issues)
7. [Security Issues](#security-issues)
8. [Deployment Issues](#deployment-issues)
9. [Monitoring and Alerts](#monitoring-and-alerts)
10. [External Service Issues](#external-service-issues)
11. [User-Reported Issues](#user-reported-issues)
12. [Emergency Procedures](#emergency-procedures)

---

## Quick Reference

### Emergency Contacts
- **On-Call Engineer**: +1-555-0199 (24/7)
- **DevOps Lead**: devops-lead@verihome.com
- **Technical Lead**: tech-lead@verihome.com
- **Product Manager**: product@verihome.com

### Key Resources
- **Status Page**: https://status.verihome.com
- **Monitoring Dashboard**: https://monitoring.verihome.com/grafana
- **Log Aggregation**: https://logs.verihome.com/kibana
- **Error Tracking**: https://verihome.sentry.io
- **Documentation**: https://docs.verihome.com

### Critical Commands
```bash
# Check application health
curl -f https://verihome.com/health

# Check API health
curl -f https://api.verihome.com/v1/health

# Restart frontend containers
docker-compose restart frontend

# Check database connectivity
pg_isready -h db-host -p 5432 -U verihome_user

# View application logs
docker-compose logs -f frontend

# Check Kubernetes pods
kubectl get pods -n verihome

# Rollback deployment
kubectl rollout undo deployment/verihome-frontend
```

---

## Common Issues

### 1. Application Not Loading

**Symptoms:**
- Users report blank pages or loading errors
- 500/502/503 HTTP errors
- Timeout errors

**Diagnosis Steps:**
```bash
# 1. Check application health
curl -I https://verihome.com/health

# 2. Check container status
docker-compose ps

# 3. Check recent deployments
kubectl rollout history deployment/verihome-frontend

# 4. Check load balancer
curl -I https://verihome.com -H "Host: verihome.com"

# 5. Check DNS resolution
nslookup verihome.com
```

**Common Causes & Solutions:**

#### Container Issues
```bash
# Check container status
docker-compose ps
docker-compose logs frontend

# Restart containers
docker-compose restart frontend

# Force recreation
docker-compose up -d --force-recreate frontend
```

#### Load Balancer Issues
```bash
# Check nginx status
docker-compose exec nginx nginx -t
docker-compose exec nginx nginx -s reload

# Check nginx logs
docker-compose logs nginx
```

#### DNS Issues
```bash
# Check DNS records
dig verihome.com
dig www.verihome.com

# Check DNS propagation
nslookup verihome.com 8.8.8.8
```

### 2. Slow Performance

**Symptoms:**
- Page load times > 5 seconds
- API responses > 2 seconds
- Users reporting sluggish interface

**Diagnosis Steps:**
```bash
# Check system resources
top
htop
free -h
df -h

# Check database performance
psql -U verihome_user -d verihome_db -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Check application metrics
curl -s http://localhost:9090/api/v1/query?query=http_request_duration_seconds
```

**Solutions:**

#### High CPU Usage
```bash
# Identify CPU-intensive processes
top -p $(pgrep -d',' -f verihome)

# Scale application containers
docker-compose up -d --scale frontend=3

# Check for infinite loops in code
grep -r "while.*true" src/
```

#### High Memory Usage
```bash
# Check memory usage by process
ps aux --sort=-%mem | head

# Restart memory-intensive containers
docker-compose restart frontend

# Check for memory leaks
valgrind --tool=memcheck --leak-check=full node dist/server.js
```

#### Database Performance
```bash
# Check active connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql -U verihome_user -d verihome_db -c "
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;"

# Analyze query plans
psql -U verihome_user -d verihome_db -c "EXPLAIN ANALYZE SELECT * FROM properties WHERE city = 'New York';"
```

### 3. Authentication Issues

**Symptoms:**
- Users cannot log in
- JWT token errors
- Unauthorized access errors

**Diagnosis Steps:**
```bash
# Check authentication service
curl -f https://api.verihome.com/v1/auth/health

# Check JWT token validation
echo "YOUR_JWT_TOKEN" | base64 -d

# Check user sessions in database
psql -U verihome_user -d verihome_db -c "SELECT count(*) FROM user_sessions WHERE expires_at > NOW();"
```

**Solutions:**

#### JWT Token Issues
```bash
# Check token expiration
node -e "
const jwt = require('jsonwebtoken');
const token = 'YOUR_TOKEN_HERE';
try {
  const decoded = jwt.decode(token);
  console.log('Token expires:', new Date(decoded.exp * 1000));
  console.log('Current time:', new Date());
} catch (e) {
  console.log('Invalid token:', e.message);
}
"

# Refresh JWT secret (if compromised)
kubectl create secret generic jwt-secret --from-literal=jwt-secret="$(openssl rand -base64 32)"
kubectl rollout restart deployment/verihome-backend
```

#### Session Issues
```bash
# Clear expired sessions
psql -U verihome_user -d verihome_db -c "DELETE FROM user_sessions WHERE expires_at < NOW();"

# Check Redis session store
redis-cli ping
redis-cli flushdb  # Use with caution - clears all sessions
```

---

## Frontend Issues

### 1. Build Failures

**Symptoms:**
- npm run build fails
- TypeScript compilation errors
- Missing dependencies

**Diagnosis:**
```bash
# Check Node.js version
node --version
npm --version

# Check for TypeScript errors
npm run type-check

# Check for linting issues
npm run lint

# Check dependencies
npm audit
npm outdated
```

**Solutions:**

#### TypeScript Errors
```bash
# Fix common TypeScript issues
npm run lint:fix

# Check tsconfig.json
cat tsconfig.json | jq .

# Clear TypeScript cache
rm -rf node_modules/.cache
rm -rf .tsbuildinfo
```

#### Dependency Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Update dependencies
npm update

# Fix vulnerability issues
npm audit fix
```

#### Memory Issues During Build
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Use webpack-bundle-analyzer to identify large bundles
npm install --save-dev webpack-bundle-analyzer
npm run build -- --analyze
```

### 2. Runtime JavaScript Errors

**Symptoms:**
- White screen of death
- Console errors
- Component crashes

**Diagnosis:**
```bash
# Check browser console for errors
# Open browser DevTools → Console

# Check Sentry for error reports
# Visit https://verihome.sentry.io

# Check error boundary logs
grep -r "ErrorBoundary" src/
```

**Solutions:**

#### React Component Errors
```typescript
// Add error boundaries to catch component errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

#### Memory Leaks
```typescript
// Check for common memory leak patterns
useEffect(() => {
  const subscription = someObservable.subscribe();
  
  // Cleanup function to prevent memory leaks
  return () => {
    subscription.unsubscribe();
  };
}, []);

// Check for unclosed intervals/timeouts
useEffect(() => {
  const interval = setInterval(() => {
    // Do something
  }, 1000);
  
  return () => clearInterval(interval);
}, []);
```

### 3. Routing Issues

**Symptoms:**
- 404 errors on refresh
- Navigation not working
- Incorrect page rendering

**Diagnosis:**
```bash
# Check nginx configuration for SPA routing
docker-compose exec nginx cat /etc/nginx/nginx.conf | grep -A 10 "location /"

# Check React Router configuration
grep -r "BrowserRouter\|Routes\|Route" src/
```

**Solutions:**

#### SPA Routing with nginx
```nginx
# Add to nginx configuration
location / {
    try_files $uri $uri/ /index.html;
}
```

#### React Router Issues
```typescript
// Ensure proper Router setup
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}
```

---

## API and Backend Issues

### 1. API Endpoint Failures

**Symptoms:**
- 500 Internal Server Error
- API timeouts
- Malformed responses

**Diagnosis:**
```bash
# Test API endpoints
curl -v -H "Authorization: Bearer YOUR_TOKEN" https://api.verihome.com/v1/properties

# Check API logs
docker-compose logs backend

# Check API health
curl -f https://api.verihome.com/v1/health
```

**Solutions:**

#### Database Connection Issues
```bash
# Check database connectivity from API container
docker-compose exec backend psql -h db -U verihome_user -d verihome_db -c "SELECT 1;"

# Check connection pool
psql -U postgres -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

# Restart database connections
docker-compose restart backend
```

#### API Rate Limiting
```bash
# Check rate limit configuration
grep -r "rate.*limit" backend/

# Check current rate limit status
redis-cli get "rate_limit:user:123"

# Reset rate limits (if needed)
redis-cli flushdb
```

### 2. CORS Issues

**Symptoms:**
- Cross-origin request blocked
- Preflight request failures
- CORS policy errors in browser

**Diagnosis:**
```bash
# Test CORS headers
curl -H "Origin: https://verihome.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api.verihome.com/v1/properties

# Check CORS configuration
grep -r "CORS\|cors" backend/settings/
```

**Solutions:**

#### CORS Configuration
```python
# Django CORS settings
CORS_ALLOWED_ORIGINS = [
    "https://verihome.com",
    "https://www.verihome.com",
    "http://localhost:3000",  # Development only
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

---

## Database Issues

### 1. Connection Failures

**Symptoms:**
- Database connection timeouts
- Too many connections error
- Connection refused errors

**Diagnosis:**
```bash
# Check database status
systemctl status postgresql

# Check active connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection limits
psql -U postgres -c "SHOW max_connections;"

# Check database logs
tail -f /var/log/postgresql/postgresql-*.log
```

**Solutions:**

#### Too Many Connections
```sql
-- Check current connections
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < current_timestamp - interval '1 hour';

-- Increase connection limit (requires restart)
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();
```

#### Connection Pool Configuration
```python
# Django database settings
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'verihome_db',
        'USER': 'verihome_user',
        'PASSWORD': 'password',
        'HOST': 'db',
        'PORT': '5432',
        'CONN_MAX_AGE': 60,  # Connection pooling
        'OPTIONS': {
            'MAX_CONNS': 20,
        }
    }
}
```

### 2. Slow Queries

**Symptoms:**
- Query timeouts
- High database CPU usage
- Slow application responses

**Diagnosis:**
```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check for missing indexes
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
FROM pg_stat_user_tables 
WHERE seq_scan > 0 
ORDER BY seq_tup_read DESC;
```

**Solutions:**

#### Add Missing Indexes
```sql
-- Common indexes for VeriHome
CREATE INDEX CONCURRENTLY idx_properties_city_status 
ON properties(city, status) WHERE status = 'available';

CREATE INDEX CONCURRENTLY idx_payments_due_date 
ON payments(due_date) WHERE status = 'pending';

CREATE INDEX CONCURRENTLY idx_messages_conversation_created 
ON messages(conversation_id, created_at);

-- Full-text search indexes
CREATE INDEX CONCURRENTLY idx_properties_search 
ON properties USING GIN(to_tsvector('english', title || ' ' || description));
```

#### Query Optimization
```sql
-- Analyze table statistics
ANALYZE properties;
ANALYZE payments;
ANALYZE messages;

-- Vacuum to reclaim space
VACUUM ANALYZE;

-- Check query execution plans
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM properties 
WHERE city = 'New York' AND status = 'available';
```

### 3. Data Integrity Issues

**Symptoms:**
- Foreign key violations
- Duplicate key errors
- Data corruption warnings

**Diagnosis:**
```sql
-- Check for orphaned records
SELECT p.id, p.title 
FROM properties p 
LEFT JOIN users u ON p.owner_id = u.id 
WHERE u.id IS NULL;

-- Check for duplicate data
SELECT email, count(*) 
FROM users 
GROUP BY email 
HAVING count(*) > 1;

-- Check constraint violations
SELECT conname, conrelid::regclass 
FROM pg_constraint 
WHERE NOT convalidated;
```

**Solutions:**

#### Fix Orphaned Records
```sql
-- Delete orphaned properties
DELETE FROM properties 
WHERE owner_id NOT IN (SELECT id FROM users);

-- Or update with valid owner
UPDATE properties 
SET owner_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE owner_id NOT IN (SELECT id FROM users);
```

#### Fix Duplicate Data
```sql
-- Remove duplicate users (keep latest)
DELETE FROM users a USING users b 
WHERE a.id < b.id AND a.email = b.email;

-- Add unique constraint to prevent future duplicates
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);
```

---

## Performance Issues

### 1. High CPU Usage

**Symptoms:**
- System sluggishness
- Response timeouts
- Load average > number of CPUs

**Diagnosis:**
```bash
# Check CPU usage
top
htop
iostat -x 1

# Check for CPU-intensive processes
ps aux --sort=-%cpu | head -20

# Check system load
uptime
cat /proc/loadavg
```

**Solutions:**

#### Identify CPU Bottlenecks
```bash
# Use perf to profile CPU usage
perf top

# Check for infinite loops
strace -p PID -e trace=futex

# Monitor specific processes
pidstat -u -p $(pgrep -f verihome) 1
```

#### Scale Applications
```bash
# Scale Docker containers
docker-compose up -d --scale frontend=3 --scale backend=2

# Scale Kubernetes deployments
kubectl scale deployment verihome-frontend --replicas=3
kubectl scale deployment verihome-backend --replicas=2
```

### 2. Memory Issues

**Symptoms:**
- Out of memory errors
- Swap usage
- Container restarts

**Diagnosis:**
```bash
# Check memory usage
free -h
cat /proc/meminfo

# Check memory usage by process
ps aux --sort=-%mem | head -20

# Check for memory leaks
valgrind --tool=memcheck --leak-check=full <command>
```

**Solutions:**

#### Increase Memory Limits
```yaml
# Docker Compose
services:
  frontend:
    mem_limit: 2g
    mem_reservation: 1g

# Kubernetes
resources:
  limits:
    memory: "2Gi"
  requests:
    memory: "1Gi"
```

#### Optimize Memory Usage
```bash
# Clear system caches
echo 3 > /proc/sys/vm/drop_caches

# Tune swap usage
echo 10 > /proc/sys/vm/swappiness

# Monitor memory usage over time
sar -r 1
```

### 3. Network Issues

**Symptoms:**
- Slow API responses
- Connection timeouts
- Packet loss

**Diagnosis:**
```bash
# Check network connectivity
ping google.com
traceroute google.com

# Check network usage
iftop
nethogs

# Check connection states
netstat -tuln
ss -tuln
```

**Solutions:**

#### Network Optimization
```bash
# Increase network buffers
echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf
sysctl -p

# Check for network errors
ethtool -S eth0 | grep -i error

# Monitor network performance
iperf3 -c target-server
```

---

## Security Issues

### 1. Authentication Bypass

**Symptoms:**
- Unauthorized access
- JWT token validation failures
- Session hijacking

**Immediate Actions:**
```bash
# Rotate JWT secrets immediately
kubectl create secret generic jwt-secret --from-literal=jwt-secret="$(openssl rand -base64 32)"
kubectl rollout restart deployment/verihome-backend

# Invalidate all active sessions
redis-cli flushall
psql -U verihome_user -d verihome_db -c "DELETE FROM user_sessions;"

# Enable additional logging
kubectl patch configmap app-config --patch '{"data":{"LOG_LEVEL":"debug"}}'
```

**Investigation:**
```bash
# Check for suspicious login attempts
psql -U verihome_user -d verihome_db -c "
SELECT ip_address, count(*), max(created_at) 
FROM login_attempts 
WHERE success = false 
AND created_at > now() - interval '1 hour'
GROUP BY ip_address 
HAVING count(*) > 10 
ORDER BY count(*) DESC;"

# Check access logs for anomalies
grep -E "(401|403)" /var/log/nginx/access.log | tail -100

# Monitor for privilege escalation
grep -i "role.*admin" /var/log/verihome/app.log
```

### 2. SQL Injection Attempts

**Symptoms:**
- Unusual database queries
- SQL syntax errors in logs
- Unauthorized data access

**Immediate Actions:**
```bash
# Enable query logging temporarily
psql -U postgres -c "ALTER SYSTEM SET log_statement = 'all';"
psql -U postgres -c "SELECT pg_reload_conf();"

# Check for suspicious queries
grep -i -E "(union|select.*from|drop|delete|update.*set)" /var/log/postgresql/postgresql-*.log

# Block suspicious IPs
iptables -A INPUT -s SUSPICIOUS_IP -j DROP
```

**Prevention:**
```python
# Ensure parameterized queries
# Good:
cursor.execute("SELECT * FROM users WHERE email = %s", [email])

# Bad:
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")
```

### 3. DDoS Attacks

**Symptoms:**
- Sudden traffic spikes
- Service unavailability
- High connection counts

**Immediate Actions:**
```bash
# Enable rate limiting
nginx -s reload  # If rate limiting is configured

# Check connection counts
netstat -an | grep :80 | wc -l
netstat -an | grep :443 | wc -l

# Block attacking IPs
for ip in $(netstat -an | grep :80 | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head -10 | awk '$1 > 100 {print $2}'); do
    iptables -A INPUT -s $ip -j DROP
done
```

**Mitigation:**
```nginx
# nginx rate limiting
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    server {
        location /api/ {
            limit_req zone=api burst=20 nodelay;
        }
        
        location /api/auth/login/ {
            limit_req zone=login burst=5 nodelay;
        }
    }
}
```

---

## Deployment Issues

### 1. Failed Deployments

**Symptoms:**
- Deployment stuck in progress
- New version not serving traffic
- Rollback required

**Diagnosis:**
```bash
# Check deployment status
kubectl rollout status deployment/verihome-frontend
kubectl get pods -l app=verihome-frontend

# Check deployment history
kubectl rollout history deployment/verihome-frontend

# Check pod logs
kubectl logs -l app=verihome-frontend --tail=100
```

**Solutions:**

#### Rollback Deployment
```bash
# Rollback to previous version
kubectl rollout undo deployment/verihome-frontend

# Rollback to specific revision
kubectl rollout undo deployment/verihome-frontend --to-revision=2

# Check rollback status
kubectl rollout status deployment/verihome-frontend
```

#### Fix Image Issues
```bash
# Check image availability
docker pull verihome/frontend:latest

# Check image registry
kubectl describe pod -l app=verihome-frontend | grep -A 5 Events

# Use specific image tag
kubectl set image deployment/verihome-frontend frontend=verihome/frontend:v1.0.0
```

### 2. Configuration Issues

**Symptoms:**
- Environment variables not set
- ConfigMap/Secret not mounted
- Application failing to start

**Diagnosis:**
```bash
# Check ConfigMaps
kubectl get configmaps
kubectl describe configmap app-config

# Check Secrets
kubectl get secrets
kubectl describe secret app-secrets

# Check environment variables in pod
kubectl exec -it deployment/verihome-frontend -- env | grep VITE_
```

**Solutions:**

#### Update Configuration
```bash
# Update ConfigMap
kubectl create configmap app-config --from-env-file=.env.production --dry-run=client -o yaml | kubectl apply -f -

# Update Secret
kubectl create secret generic app-secrets --from-env-file=.env.secrets --dry-run=client -o yaml | kubectl apply -f -

# Restart deployment to pick up changes
kubectl rollout restart deployment/verihome-frontend
```

---

## Monitoring and Alerts

### 1. False Alerts

**Symptoms:**
- Alert fatigue
- Non-actionable alerts
- Missing critical alerts

**Solutions:**

#### Tune Alert Thresholds
```yaml
# Prometheus alert rules
groups:
  - name: verihome_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m  # Increased from 2m to reduce noise
        labels:
          severity: warning  # Reduced from critical
```

#### Create Alert Hierarchy
```yaml
# Low severity alerts
- alert: HighMemoryUsage
  expr: memory_usage > 0.8
  labels:
    severity: warning
    
# High severity alerts  
- alert: ServiceDown
  expr: up == 0
  for: 1m
  labels:
    severity: critical
```

### 2. Missing Metrics

**Symptoms:**
- Gaps in monitoring data
- Metrics not appearing in Grafana
- Scrape failures

**Diagnosis:**
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check metric collection
curl http://localhost:9100/metrics | grep node_cpu

# Check Prometheus configuration
curl http://localhost:9090/api/v1/status/config
```

**Solutions:**

#### Fix Scraping Issues
```yaml
# Prometheus configuration
scrape_configs:
  - job_name: 'verihome-frontend'
    static_configs:
      - targets: ['frontend:80']
    metrics_path: '/metrics'
    scrape_interval: 30s
    scrape_timeout: 10s
```

---

## External Service Issues

### 1. Payment Gateway Failures

**Symptoms:**
- Payment processing errors
- Stripe webhook failures
- Transaction timeouts

**Diagnosis:**
```bash
# Check Stripe status
curl https://status.stripe.com/api/v2/status.json

# Check webhook endpoints
curl -X POST https://api.verihome.com/webhooks/stripe/ \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check payment logs
grep -i "stripe\|payment" /var/log/verihome/app.log
```

**Solutions:**

#### Webhook Issues
```python
# Verify webhook signatures
import stripe

def verify_webhook_signature(payload, sig_header, endpoint_secret):
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
        return event
    except ValueError:
        # Invalid payload
        return None
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        return None
```

#### Fallback Payment Methods
```typescript
// Implement payment fallback
const processPayment = async (paymentData) => {
  try {
    return await stripePayment(paymentData);
  } catch (error) {
    console.error('Stripe payment failed:', error);
    // Fallback to alternative payment method
    return await alternativePayment(paymentData);
  }
};
```

### 2. Email Service Issues

**Symptoms:**
- Emails not being sent
- High bounce rates
- Delivery delays

**Diagnosis:**
```bash
# Check SendGrid status
curl https://status.sendgrid.com/api/v2/status.json

# Check email queue
redis-cli llen email_queue

# Check email logs
grep -i "email\|sendgrid" /var/log/verihome/app.log
```

**Solutions:**

#### Email Queue Management
```python
# Process email queue
def process_email_queue():
    while True:
        email_data = redis_client.lpop('email_queue')
        if email_data:
            try:
                send_email(json.loads(email_data))
            except Exception as e:
                # Retry mechanism
                retry_count = email_data.get('retry_count', 0)
                if retry_count < 3:
                    email_data['retry_count'] = retry_count + 1
                    redis_client.rpush('email_retry_queue', json.dumps(email_data))
```

---

## User-Reported Issues

### 1. Login Problems

**User Symptoms:**
- "Invalid credentials" for correct password
- Account locked messages
- Can't reset password

**Support Steps:**
```bash
# Check user account status
psql -U verihome_user -d verihome_db -c "
SELECT id, email, is_active, last_login, failed_login_attempts 
FROM users 
WHERE email = 'user@example.com';"

# Check recent login attempts
psql -U verihome_user -d verihome_db -c "
SELECT * FROM login_attempts 
WHERE email = 'user@example.com' 
ORDER BY created_at DESC 
LIMIT 10;"

# Reset failed login attempts
psql -U verihome_user -d verihome_db -c "
UPDATE users 
SET failed_login_attempts = 0 
WHERE email = 'user@example.com';"
```

### 2. Missing Data

**User Symptoms:**
- Properties not showing
- Messages disappeared
- Payment history empty

**Support Steps:**
```bash
# Check user data existence
psql -U verihome_user -d verihome_db -c "
SELECT 'properties' as type, count(*) 
FROM properties WHERE owner_id = USER_ID
UNION ALL
SELECT 'messages' as type, count(*) 
FROM messages WHERE sender_id = USER_ID OR receiver_id = USER_ID
UNION ALL
SELECT 'payments' as type, count(*) 
FROM payments p 
JOIN contracts c ON p.contract_id = c.id 
WHERE c.tenant_id = USER_ID;"

# Check for soft deletes
psql -U verihome_user -d verihome_db -c "
SELECT count(*) 
FROM properties 
WHERE owner_id = USER_ID AND deleted_at IS NOT NULL;"
```

### 3. Performance Complaints

**User Symptoms:**
- Slow page loading
- Timeout errors
- Unresponsive interface

**Support Steps:**
```bash
# Check user's geographic location
curl "http://ip-api.com/json/USER_IP"

# Check CDN performance for user's region
curl -w "@curl-format.txt" -o /dev/null -s "https://verihome.com/static/js/main.js"

# Check specific user's session performance
grep "user_id:USER_ID" /var/log/verihome/performance.log | tail -20
```

---

## Emergency Procedures

### 1. Complete System Outage

**Immediate Actions (0-5 minutes):**
```bash
# 1. Acknowledge incident
curl -X POST "$PAGERDUTY_API" -H "Authorization: Token $PAGERDUTY_TOKEN" \
  -d '{"incident":{"type":"incident","title":"System Outage","service":{"id":"SERVICE_ID"}}}'

# 2. Check system status
systemctl status nginx postgresql redis
docker-compose ps

# 3. Check external dependencies
curl -f https://status.stripe.com/api/v2/status.json
curl -f https://status.sendgrid.com/api/v2/status.json

# 4. Initial communication
curl -X POST "$SLACK_WEBHOOK" \
  -d '{"text":"🚨 SYSTEM OUTAGE DETECTED - Investigating immediately"}'
```

**Investigation (5-15 minutes):**
```bash
# Check logs for errors
tail -100 /var/log/nginx/error.log
docker-compose logs --tail=100 frontend backend
journalctl -u postgresql --since "5 minutes ago"

# Check system resources
top
df -h
free -h

# Check network connectivity
ping 8.8.8.8
curl -I https://api.verihome.com/health
```

**Recovery Actions:**
```bash
# Service restart sequence
docker-compose restart redis
docker-compose restart backend
docker-compose restart frontend
systemctl restart nginx

# Database recovery (if needed)
systemctl restart postgresql
# Wait for database to be ready
until pg_isready; do sleep 1; done

# Verify recovery
curl -f https://verihome.com/health
curl -f https://api.verihome.com/v1/health
```

### 2. Data Breach Response

**Immediate Actions (0-15 minutes):**
```bash
# 1. Isolate affected systems
iptables -A INPUT -j DROP  # Block all incoming traffic
docker-compose down  # Stop all services

# 2. Preserve evidence
cp -r /var/log /tmp/incident-logs-$(date +%Y%m%d-%H%M%S)
pg_dump verihome_db > /tmp/db-snapshot-$(date +%Y%m%d-%H%M%S).sql

# 3. Alert security team
curl -X POST "$SECURITY_ALERT_WEBHOOK" \
  -d '{"alert":"POTENTIAL_DATA_BREACH","timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}'
```

**Investigation Actions:**
```bash
# Check for unauthorized access
grep -i "admin" /var/log/nginx/access.log | grep -v "legitimate_admin_ip"
psql -c "SELECT * FROM user_sessions WHERE created_at > '2024-01-01 12:00:00' ORDER BY created_at DESC;"

# Check for data exfiltration
grep -E "(SELECT.*\*|COPY|pg_dump)" /var/log/postgresql/postgresql-*.log
netstat -an | grep ESTABLISHED | grep -v "known_good_connections"
```

### 3. Database Corruption

**Immediate Actions:**
```bash
# 1. Stop all applications
docker-compose stop frontend backend

# 2. Assess corruption scope
psql -c "SELECT datname FROM pg_database;" # Check if connection works
psql -d verihome_db -c "SELECT count(*) FROM users;" # Test critical table

# 3. Switch to read-only mode if partially functional
psql -c "ALTER DATABASE verihome_db SET default_transaction_read_only = on;"
```

**Recovery Process:**
```bash
# 1. Restore from latest backup
bash /opt/scripts/recovery-database-simple.sh /path/to/latest/backup.dump

# 2. Verify data integrity
psql -d verihome_db -c "
SELECT 
  'users' as table_name, count(*) as row_count
FROM users
UNION ALL
SELECT 
  'properties' as table_name, count(*) as row_count
FROM properties;"

# 3. Re-enable write access
psql -c "ALTER DATABASE verihome_db SET default_transaction_read_only = off;"

# 4. Restart applications
docker-compose up -d
```

---

## Escalation Procedures

### Severity Levels

#### Severity 1 (Critical)
- Complete system outage
- Data breach or security incident
- Payment processing down
- **Response Time**: Immediate (0-15 minutes)
- **Escalation**: On-call engineer → Tech Lead → CTO

#### Severity 2 (High)
- Partial service degradation
- Database performance issues
- Authentication problems
- **Response Time**: 30 minutes
- **Escalation**: On-call engineer → Tech Lead

#### Severity 3 (Medium)
- Individual feature failures
- Performance degradation
- Third-party service issues
- **Response Time**: 2 hours
- **Escalation**: Support team → Development team

#### Severity 4 (Low)
- Minor bugs
- UI inconsistencies
- Documentation issues
- **Response Time**: Next business day
- **Escalation**: Standard support process

### Contact Information

```bash
# Emergency contacts (available 24/7)
ON_CALL_PHONE="+1-555-0199"
TECH_LEAD_EMAIL="tech-lead@verihome.com"
DEVOPS_LEAD_EMAIL="devops-lead@verihome.com"

# Business hours contacts
PRODUCT_MANAGER="product@verihome.com"
CUSTOMER_SUCCESS="success@verihome.com"
LEGAL_TEAM="legal@verihome.com"

# External contacts
HOSTING_PROVIDER_SUPPORT="+1-555-AWS-HELP"
CDN_SUPPORT="+1-555-CDN-HELP"
PAYMENT_PROCESSOR_SUPPORT="+1-555-STRIPE"
```

---

## Documentation and Knowledge Base

### Internal Resources
- **Runbooks**: `/opt/docs/runbooks/`
- **Architecture Docs**: `/opt/docs/architecture/`
- **API Documentation**: `https://docs.verihome.com/api`
- **Deployment Guides**: `/opt/docs/deployment/`

### External Resources
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **React Documentation**: https://reactjs.org/docs/
- **Docker Documentation**: https://docs.docker.com/
- **Kubernetes Documentation**: https://kubernetes.io/docs/

### Monitoring Tools
- **Grafana**: https://monitoring.verihome.com/grafana
- **Prometheus**: https://monitoring.verihome.com/prometheus
- **Kibana**: https://logs.verihome.com/kibana
- **Sentry**: https://verihome.sentry.io

---

**Document Version**: 1.0.0  
**Last Updated**: 2024-01-01  
**Next Review**: 2024-02-01  
**Document Owner**: DevOps Team

**Contributing**: To add new troubleshooting procedures, create a pull request with:
1. Problem description and symptoms
2. Step-by-step diagnosis process
3. Tested solutions
4. Prevention measures

---

*This troubleshooting guide is a living document. Please keep it updated with new issues and solutions as they are discovered.*