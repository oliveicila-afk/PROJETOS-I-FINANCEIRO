# Staging Environment Monitoring Guide

## Overview

This guide explains how to monitor the Etapa 7 staging deployment to ensure all systems are functioning correctly before production.

## 1. Application Health Monitoring

### 1.1 Health Check Endpoint
```bash
# Check if service is running
curl http://localhost:3001/health

# Expected response:
# HTTP 200 OK
# { "status": "ok", "timestamp": "2026-10-08T18:00:00Z" }
```

### 1.2 Logs

**Console Logs**
```bash
# Follow real-time logs
docker logs -f archiving-api-staging

# View last 100 lines
docker logs --tail 100 archiving-api-staging

# Search for errors
docker logs archiving-api-staging | grep ERROR
docker logs archiving-api-staging | grep "🚨"
```

**File Logs**
```bash
# Application logs
tail -f ./logs/app.log
tail -f ./logs/error.log

# History file
cat .archiving-history.staging.json | jq '.entries[-5:]'
```

## 2. Endpoint Monitoring

### 2.1 History Endpoint
```bash
# Get archiving history
curl http://localhost:3001/archiving/history

# Response structure:
# {
#   "entries": [
#     {
#       "id": "...",
#       "timestamp": "2026-10-08T18:00:00Z",
#       "processNumber": "0000001-XX.XXXX.X.XX.XXXX",
#       "clientName": "Test Client",
#       "status": "success",
#       "attempt": 1,
#       "maxAttempts": 3,
#       "durationMs": 1500
#     }
#   ],
#   "totalEntries": 42
# }
```

### 2.2 Statistics Endpoint
```bash
# Get archiving statistics
curl http://localhost:3001/archiving/stats

# Response structure:
# {
#   "totalAttempts": 42,
#   "successCount": 38,
#   "errorCount": 4,
#   "successRate": 90.48,
#   "lastUpdated": "2026-10-08T18:00:00Z",
#   "averageDurationMs": 1250
# }
```

## 3. Webhook Testing & Monitoring

### 3.1 Send Test Webhook
```bash
# Test successful case
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRM_TOKEN}" \
  -d '{
    "caseId": "CASE-001",
    "processNumber": "0000001-XX.XXXX.X.XX.XXXX",
    "clientName": "Test Client",
    "lawsuitId": "lawsuit-123",
    "changeColumn": "PARA_ARQUIVAR",
    "timestamp": "2026-10-08T18:00:00Z"
  }'

# Expected response (HTTP 200):
# {
#   "success": true,
#   "message": "Archiving process started",
#   "caseId": "CASE-001",
#   "taskId": "task-12345"
# }
```

### 3.2 Monitor Webhook Failures
```bash
# Test with invalid token (should get 401)
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token" \
  -d '{...}'

# Test with malformed payload (should get 400)
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRM_TOKEN}" \
  -d '{invalid json}'
```

## 4. Slack Notifications Monitoring

### 4.1 Slack Channel Setup
```
Create two Slack channels:
- #staging-alerts: For critical alerts and errors
- #staging-logs: For general execution logs
```

### 4.2 Expected Notifications

**Success Notification**
```
✅ SUCCESS: Test Client | 0000001-XX.XXXX.X.XX.XXXX
Task created in Advbox: ADVM-2026-10-001
Status: Complete
Duration: 2.3s
```

**Error Notification**
```
🚨 ERROR: Test Client | 0000001-XX.XXXX.X.XX.XXXX
Error: Connection timeout to Advbox API
Attempt: 3/3
Duration: 45.2s
Next: Manual review required
```

**Retry Notification**
```
🔄 RETRY: Test Client | 0000001-XX.XXXX.X.XX.XXXX
Attempt: 2/3
Error: Temporary network issue
Waiting: 2000ms before retry
```

**Critical Alert**
```
🔴 CRITICAL: Multiple consecutive failures detected
Cases affected: 5
Last error: Authentication failure
Action: Immediate manual review required
```

## 5. Redis Cache Monitoring

### 5.1 Redis Health Check
```bash
# Connect to Redis
redis-cli -p 6379

# Check connection
> PING
PONG

# Check memory usage
> INFO memory

# Monitor real-time commands
> MONITOR
```

### 5.2 Cache Keys
```bash
# List cache keys
redis-cli KEYS "archiving:*"

# Get specific cache entry
redis-cli GET "archiving:case:CASE-001"

# Monitor key expiration
redis-cli EXPIRETIME "archiving:case:CASE-001"
```

## 6. Elasticsearch & Kibana Logs

### 6.1 Kibana Dashboard
```
Access: http://localhost:5601

1. Create index pattern:
   - Index pattern name: logs-archiving-*
   - Time field: timestamp
   - Click Create

2. Create visualizations:
   - Success rate over time
   - Error distribution by type
   - Average processing time
   - Webhook response times
```

### 6.2 Log Queries
```
# Search for all errors
status: "error"

# Search for specific case
processNumber: "0000001-XX.XXXX.X.XX.XXXX"

# Search for slow operations (>5s)
durationMs: [5000 TO *]

# Search for authentication errors
error.type: "authentication_error"
```

## 7. Performance Monitoring

### 7.1 Response Time Monitoring
```bash
# Measure webhook response time
time curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRM_TOKEN}" \
  -d '{...}'

# Expected: < 2 seconds for success
# Expected: < 10 seconds for error with retries
```

### 7.2 Resource Monitoring
```bash
# Monitor Docker container resources
docker stats archiving-api-staging

# Expected metrics:
# CPU: < 5% under normal load
# Memory: < 256MB
# Network: < 1MB/s
```

## 8. Failure Scenario Testing

### 8.1 Test Retry Logic
```bash
# Simulate timeout by using a non-existent endpoint
curl -X POST http://localhost:3001/webhook \
  --max-time 5 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRM_TOKEN}" \
  -d '{...}'

# Monitor logs for retry attempts
docker logs archiving-api-staging | grep "Retry Manager"
```

### 8.2 Test Circuit Breaker
```bash
# Send multiple failures rapidly
for i in {1..10}; do
  curl -X POST http://localhost:3001/webhook \
    -H "Authorization: Bearer ${CRM_TOKEN}" \
    -d '{invalid}' &
done
wait

# Monitor for circuit breaker activation
docker logs archiving-api-staging | grep "CRITICAL"
```

## 9. Monitoring Dashboard Setup

### 9.1 Create Prometheus Config
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'archiving-staging'
    static_configs:
      - targets: ['localhost:3001']
```

### 9.2 Metrics to Collect
```
- archiving_webhook_requests_total
- archiving_webhook_duration_seconds
- archiving_process_attempts_total
- archiving_process_successes_total
- archiving_process_failures_total
- archiving_slack_notifications_sent
```

## 10. Alert Thresholds

### Critical Alerts (Page Immediately)
- Success rate < 80% in 5 minutes
- 3+ consecutive failures
- Response time > 30 seconds
- Service down (health check fails)

### Warning Alerts (Create Ticket)
- Success rate < 95%
- Response time > 10 seconds
- Memory usage > 200MB
- Error spike (2x normal rate)

## 11. Monitoring Checklist

Use this checklist during staging validation:

- [ ] Health endpoint responds (HTTP 200)
- [ ] Logs show no errors after webhook test
- [ ] History endpoint returns entries
- [ ] Statistics show correct counts
- [ ] Slack notifications received for all events
- [ ] Redis cache working properly
- [ ] Elasticsearch indexing logs correctly
- [ ] Kibana dashboard displaying data
- [ ] Response times < 2s for success cases
- [ ] Retry logic working with backoff
- [ ] Resource usage within limits
- [ ] No memory leaks over 1 hour
- [ ] All 51 tests still passing

## 12. Rollback Procedures

If monitoring reveals critical issues:

```bash
# Stop staging service
docker-compose -f docker-compose.staging.yml down

# Check logs for issues
docker logs archiving-api-staging > /tmp/staging-failure.log

# Review error logs
grep ERROR ./logs/app.log

# Rollback to previous version (if deployed)
git checkout HEAD~1
npm run build
docker-compose -f docker-compose.staging.yml up -d

# Verify rollback
curl http://localhost:3001/health
```

## References

- [Docker Monitoring](https://docs.docker.com/config/containers/logging/)
- [Elasticsearch Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
- [Redis Commands](https://redis.io/commands/)
- [Prometheus Metrics](https://prometheus.io/docs/concepts/metrics/)
