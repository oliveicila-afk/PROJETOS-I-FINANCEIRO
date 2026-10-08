# Etapa 7: Staging Validation Checklist

**Start Date**: 2026-10-08  
**Target Completion**: 2026-10-09  
**Status**: 🔄 In Progress  

---

## Phase 1: Environment Setup

- [ ] Create `.env.staging` with test credentials
- [ ] Verify access to staging APIs:
  - [ ] Advbox staging environment
  - [ ] Asaas sandbox environment
  - [ ] CRM Financial staging webhook
  - [ ] Slack webhook for #staging-alerts
- [ ] Build Docker image successfully
- [ ] All unit tests passing (51/51)
- [ ] Docker-compose configuration validated

**Responsible**: DevOps Team  
**Deadline**: 2026-10-08 20:00  
**Status**: ⏳ Pending  

---

## Phase 2: Deployment to Staging

- [ ] Start Docker containers
  ```bash
  docker-compose -f docker-compose.staging.yml up -d
  ```
- [ ] Verify service health
  ```bash
  curl http://localhost:3001/health
  ```
- [ ] Check logs for startup errors
  ```bash
  docker logs archiving-api-staging
  ```
- [ ] Redis cache operational
- [ ] Elasticsearch & Kibana running
- [ ] All services responding correctly

**Responsible**: DevOps Team  
**Deadline**: 2026-10-08 21:00  
**Status**: ⏳ Pending  

---

## Phase 3: Webhook Integration Tests

### 3.1 Basic Webhook Test
```bash
./scripts/staging-test.sh
```

- [ ] Health check passes
- [ ] Webhook endpoint receives POST requests
- [ ] Request validation working
- [ ] HTTP 200 response on success
- [ ] HTTP 401 on invalid auth
- [ ] HTTP 400 on malformed payload

**Responsible**: QA Team  
**Deadline**: 2026-10-08 22:00  
**Status**: ⏳ Pending  

### 3.2 Webhook Payload Tests

Test each payload type:

- [ ] Successful case (PARA_ARQUIVAR column)
  - Case ID: CASE-STAGING-001
  - Process: 0000001-XX.XXXX.X.XX.XXXX
  - Expected: HTTP 200, task created in Advbox
  
- [ ] Invalid authentication
  - Send with wrong token
  - Expected: HTTP 401, error logged
  
- [ ] Missing required fields
  - Omit processNumber
  - Expected: HTTP 400, validation error
  
- [ ] Duplicate case
  - Send same caseId twice
  - Expected: Idempotent handling, no duplicate tasks

**Responsible**: QA Team  
**Deadline**: 2026-10-08 23:00  
**Status**: ⏳ Pending  

---

## Phase 4: Data Verification

After webhook tests:

- [ ] History file updated (`.archiving-history.staging.json`)
  ```bash
  cat .archiving-history.staging.json | jq '.entries | length'
  ```

- [ ] Task created in Advbox
  - [ ] Correct process number
  - [ ] Correct client name
  - [ ] Assigned to correct user (Gabi)
  - [ ] Correct task type (ARQUIVAMENTO DEFINITIVO)

- [ ] Statistics endpoint accurate
  ```bash
  curl http://localhost:3001/archiving/stats
  ```
  - [ ] totalAttempts matches webhook sends
  - [ ] successCount > 0
  - [ ] successRate > 80%

**Responsible**: QA Team  
**Deadline**: 2026-10-09 01:00  
**Status**: ⏳ Pending  

---

## Phase 5: Slack Notifications

- [ ] Success notification received
  - [ ] Contains case ID
  - [ ] Contains process number
  - [ ] Shows task ID created
  - [ ] Shows execution time
  
- [ ] Error notification received (from error test)
  - [ ] Describes error clearly
  - [ ] Shows retry count
  - [ ] Provides context for debugging
  
- [ ] Retry notification received (from timeout test)
  - [ ] Shows attempt number
  - [ ] Shows backoff delay
  - [ ] Indicates next retry time

- [ ] Critical alert threshold
  - [ ] Send 5 failing webhooks
  - [ ] Verify critical alert fires
  - [ ] Alert includes escalation info

**Responsible**: QA Team  
**Slack Channels**: #staging-alerts, #staging-logs  
**Deadline**: 2026-10-09 02:00  
**Status**: ⏳ Pending  

---

## Phase 6: Retry & Backoff Testing

- [ ] Exponential backoff working
  - [ ] Test timeout scenario
  - [ ] Verify 1s delay after attempt 1
  - [ ] Verify 2s delay after attempt 2
  - [ ] Verify 4s delay after attempt 3
  
- [ ] Max retries honored
  - [ ] Force failure scenario
  - [ ] Verify stops at maxRetries (3)
  - [ ] Total attempts = 1 initial + 3 retries = 4
  
- [ ] Retry notification to Slack
  - [ ] Sent after each retry
  - [ ] Contains attempt information
  - [ ] Contains delay information

**Responsible**: QA Team  
**Deadline**: 2026-10-09 03:00  
**Status**: ⏳ Pending  

---

## Phase 7: Polling Fallback Testing

- [ ] Disable webhook listener
  - [ ] Stop webhook endpoint
  - [ ] Modify env var: POLLING_ENABLED=true

- [ ] Polling activates every 15 minutes
  - [ ] Check logs for polling attempts
  - [ ] Verify correct timestamp filtering
  - [ ] Ensure no duplicate processing

- [ ] Cases picked up by polling
  - [ ] Add case manually to CRM
  - [ ] Wait for polling interval
  - [ ] Verify automation triggered
  - [ ] Verify Slack notification sent

- [ ] Fallback idempotency
  - [ ] Re-enable webhook
  - [ ] Verify no double-processing
  - [ ] History shows single entry, not duplicates

**Responsible**: QA Team  
**Deadline**: 2026-10-09 04:00  
**Status**: ⏳ Pending  

---

## Phase 8: Error Handling & Recovery

### 8.1 Network Timeouts
- [ ] Simulate Advbox API timeout
  - [ ] Mock slow response (>30s)
  - [ ] Verify timeout caught
  - [ ] Verify retry triggered
  - [ ] Verify error logged

### 8.2 Authentication Errors
- [ ] Test with expired Advbox token
  - [ ] Expected: 401 error
  - [ ] Verify critical alert sent
  - [ ] Verify escalation notification

### 8.3 Rate Limiting
- [ ] Send 100 webhooks in 1 minute
  - [ ] Verify graceful handling
  - [ ] Verify queue management
  - [ ] Check resource usage

### 8.4 Invalid Response Data
- [ ] Advbox returns malformed JSON
  - [ ] Verify error handling
  - [ ] Verify retry attempt
  - [ ] Verify logging of issue

**Responsible**: QA Team  
**Deadline**: 2026-10-09 05:00  
**Status**: ⏳ Pending  

---

## Phase 9: Load Testing

```bash
./scripts/staging-load-test.sh  # Run 50 concurrent webhooks
```

- [ ] All requests processed
- [ ] No timeouts or dropped connections
- [ ] Memory usage stable (< 256MB)
- [ ] CPU usage reasonable (< 10%)
- [ ] Response times acceptable (< 5s average)
- [ ] All successes logged correctly

**Responsible**: QA Team  
**Load Test Params**: 50 concurrent, 30 second duration  
**Deadline**: 2026-10-09 06:00  
**Status**: ⏳ Pending  

---

## Phase 10: Monitoring Validation

- [ ] Elasticsearch indexing logs
  ```bash
  curl http://localhost:9200/_cat/indices
  ```

- [ ] Kibana dashboard displaying data
  - [ ] Index pattern created
  - [ ] Logs visible in Kibana
  - [ ] Time range selector working

- [ ] Logs include required fields
  - [ ] timestamp
  - [ ] level (INFO, ERROR, DEBUG)
  - [ ] service (archiving-service)
  - [ ] message
  - [ ] context (caseId, processNumber)

- [ ] Alert thresholds configured
  - [ ] Success rate < 80% triggers alert
  - [ ] 3+ failures triggers critical alert
  - [ ] Response time > 10s triggers warning

**Responsible**: DevOps Team  
**Deadline**: 2026-10-09 07:00  
**Status**: ⏳ Pending  

---

## Phase 11: Data Integrity Tests

- [ ] No case duplication
  - [ ] Send same webhook 10 times
  - [ ] History shows single entry
  - [ ] Single task in Advbox

- [ ] Correct data persistence
  - [ ] Restart containers
  - [ ] History preserved in file
  - [ ] No data loss

- [ ] Case status consistency
  - [ ] Check CRM status
  - [ ] Check Advbox task status
  - [ ] Check history record
  - [ ] All consistent

**Responsible**: QA Team  
**Deadline**: 2026-10-09 08:00  
**Status**: ⏳ Pending  

---

## Phase 12: Performance Benchmarks

Record baseline metrics:

- [ ] Webhook response time: _____ ms (target: < 2000ms)
- [ ] Success rate: ____% (target: > 95%)
- [ ] Average retry count: _____ (target: < 1.2)
- [ ] Memory usage: _____ MB (target: < 256MB)
- [ ] CPU usage: ____% (target: < 5%)

**Responsible**: QA Team  
**Deadline**: 2026-10-09 09:00  
**Status**: ⏳ Pending  

---

## Phase 13: Documentation Review

- [ ] STAGING_DEPLOYMENT.md complete and accurate
- [ ] STAGING_MONITORING.md includes all endpoints
- [ ] Runbooks created for common issues
- [ ] Troubleshooting guide updated
- [ ] All credentials documented in secure location

**Responsible**: Documentation Team  
**Deadline**: 2026-10-09 10:00  
**Status**: ⏳ Pending  

---

## Final Approval Checklist

All of the following must be checked before proceeding to Etapa 8:

- [ ] All unit tests passing (51/51)
- [ ] Webhook receives and processes events correctly
- [ ] Automation fires in < 2 seconds
- [ ] Advbox tasks created with correct data
- [ ] History logging working properly
- [ ] Slack notifications sent reliably
- [ ] Retry logic with backoff working
- [ ] Polling fallback functional
- [ ] Error handling and alerts working
- [ ] No data duplication
- [ ] Load test successful (50 concurrent requests)
- [ ] Monitoring system operational
- [ ] All logs properly indexed
- [ ] Performance metrics within targets
- [ ] Documentation complete and accurate

**Sign-off Required From**:
- [ ] QA Lead
- [ ] DevOps Lead
- [ ] Technical Lead
- [ ] Project Manager

**Staging Validation Complete**: ⏳ Pending  
**Date Completed**: ___________  
**Sign-off Date**: ___________  

---

## Escalation Contacts

If issues arise during staging:

- **Technical Issues**: CTO / Technical Lead
- **Integration Issues**: API Integration Team
- **Infrastructure Issues**: DevOps Team
- **Timeline Issues**: Project Manager

---

## Next Steps

Once all checkboxes in **Final Approval Checklist** are marked:

1. ✅ Get sign-off from all required parties
2. ✅ Create production deployment plan
3. ✅ Brief production support team
4. ✅ Schedule production deployment window
5. ✅ Proceed to **Etapa 8: Deploy Produção**

---

**Etapa 7 Status Summary**

| Phase | Status | Completion |
|-------|--------|------------|
| 1. Environment Setup | ⏳ Pending | __ / __ |
| 2. Deployment | ⏳ Pending | __ / __ |
| 3. Webhook Tests | ⏳ Pending | __ / __ |
| 4. Data Verification | ⏳ Pending | __ / __ |
| 5. Slack Notifications | ⏳ Pending | __ / __ |
| 6. Retry Testing | ⏳ Pending | __ / __ |
| 7. Polling Fallback | ⏳ Pending | __ / __ |
| 8. Error Handling | ⏳ Pending | __ / __ |
| 9. Load Testing | ⏳ Pending | __ / __ |
| 10. Monitoring | ⏳ Pending | __ / __ |
| 11. Data Integrity | ⏳ Pending | __ / __ |
| 12. Performance | ⏳ Pending | __ / __ |
| 13. Documentation | ⏳ Pending | __ / __ |
| Final Approval | ⏳ Pending | __ / __ |

---

**Last Updated**: 2026-10-08 16:30 UTC  
**Created By**: Claude Haiku 4.5  
**Version**: 1.0
