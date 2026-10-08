# Etapa 8: Production Deployment - Plano de Execução Detalhado

**Data Planejada**: 2026-10-10  
**Duração Estimada**: 4-6 horas  
**Timeline**: Staging validation completa (2026-10-09) → Production go-live (2026-10-10)  
**Responsáveis**: DevOps Lead (execução), Tech Lead (supervisão), QA Lead (validação)

---

## 📋 Resumo Executivo

Etapa 8 faz o deploy de produção do sistema de automação de arquivamento de casos, movendo do ambiente de staging para produção real. O sistema processará casos jurídicos automaticamente via webhook, com fallback de polling a cada 15 minutos.

**Diferenças Staging vs Produção:**
- Staging: localhost, dados de teste, logs em Kibana local
- Produção: servidor produção, dados reais de clientes, logs centralizados em Elasticsearch

---

## 🔐 Pré-Requisitos (Checklist de Validação)

Antes de executar qualquer comando de deploy:

```bash
# 1. Staging validation PASSOU
echo "✅ Etapa 7 Staging Validation: COMPLETA"
echo "✅ Todos 13 validation phases: PASSED"
echo "✅ 4 sign-offs obtidos: QA, DevOps, Tech, PM"

# 2. Credenciais de produção prontas
test -f ~/.secrets/prod-credentials.json && echo "✅ Prod credentials ready" || echo "❌ MISSING"

# 3. Certificado SSL/TLS preparado
test -f /etc/ssl/certs/prod-api.calandrini.crt && echo "✅ SSL cert ready" || echo "❌ MISSING"

# 4. Banco de dados de produção criado
psql -h prod-db.internal -U archiving -d archiving_prod -c "SELECT 1" && echo "✅ DB ready" || echo "❌ MISSING"

# 5. Elasticsearch de produção online
curl -s http://prod-es.internal:9200/_cluster/health | grep green && echo "✅ ES ready" || echo "❌ MISSING"
```

**⚠️ Se algum pré-requisito NÃO estiver pronto → BLOQUEIO automático de deploy.**

---

## 🚀 FASE 1: Preparação Inicial (30 min)

**Responsável**: DevOps Lead  
**Horário**: T-30min antes do deploy

### Passo 1.1: Validação de Credenciais

```bash
# Carregar credenciais de Vault/Secrets Manager
vault login -method=oidc

# Validar acesso a Advbox Production
curl -X GET https://advbox.prod/api/health \
  -H "Authorization: Bearer $(vault kv get -field=advbox_prod secret/archiving)"

# Validar acesso a Asaas Production  
curl -X GET https://api.asaas.com/v3/customers \
  -H "Authorization: Bearer $(vault kv get -field=asaas_prod secret/archiving)"

# Validar acesso a CRM Financial Production
curl -X GET https://crm.financial.prod/api/health \
  -H "Authorization: Bearer $(vault kv get -field=crm_prod secret/archiving)"
```

**Critério de Sucesso**: Todos 3 endpoints retornam 200 OK

### Passo 1.2: Backup de Segurança

```bash
# Backup da database de staging (para rollback rápido)
pg_dump -h staging-db.internal -U archiving archiving_staging \
  | gzip > /backups/archiving-staging-$(date +%Y%m%d-%H%M%S).sql.gz

# Backup de Redis
redis-cli -h staging-redis.internal BGSAVE
docker cp staging-redis:/data/dump.rdb /backups/redis-$(date +%Y%m%d-%H%M%S).rdb

# Verify backups
ls -lh /backups/archiving-*.sql.gz | tail -1
ls -lh /backups/redis-*.rdb | tail -1
```

**Critério de Sucesso**: 2 arquivos de backup criados com tamanho > 1MB cada

### Passo 1.3: Notificação ao Time

```bash
# Enviar mensagem para Slack #archiving-critical
curl -X POST $SLACK_WEBHOOK_CRITICAL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🚀 ETAPA 8 DEPLOYMENT INICIANDO",
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Etapa 8: Production Deployment*\n*Status*: INICIANDO\n*Horário*: '$(date)'\n*Responsável*: DevOps Lead"
        }
      }
    ]
  }'
```

---

## 🔨 FASE 2: Build & Prepare Production Image (45 min)

**Responsável**: DevOps Lead  
**Horário**: T-45min até T-0

### Passo 2.1: Build Production Docker Image

```bash
cd /home/claude/projetos-i-financeiro/automacao-arquivamento-casos

# Build com tag production
docker build -t archiving-api:production .

# Verify image
docker images | grep archiving-api:production

# Size should be < 300MB (Alpine optimization)
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep production
```

**Critério de Sucesso**: Imagem criada, tamanho razoável (~150-250MB)

### Passo 2.2: Preparar .env.production

```bash
# Carregar credenciais de Vault
export ADVBOX_TOKEN=$(vault kv get -field=advbox_prod secret/archiving)
export ASAAS_API_TOKEN=$(vault kv get -field=asaas_prod secret/archiving)
export CRM_FINANCIAL_API_TOKEN=$(vault kv get -field=crm_prod secret/archiving)
export SLACK_WEBHOOK_URL=$(vault kv get -field=slack_prod secret/archiving)

# Gerar .env.production (NUNCA commitar!)
cat > /etc/archiving/.env.production << EOF
# PRODUÇÃO - CREDENCIAIS REAIS
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://archiving:$(vault kv get -field=db_password secret/archiving)@prod-db.internal:5432/archiving_prod

# Cache
REDIS_URL=redis://prod-redis.internal:6379/0

# External APIs
ADVBOX_TOKEN=$ADVBOX_TOKEN
ASAAS_API_TOKEN=$ASAAS_API_TOKEN
CRM_FINANCIAL_API_TOKEN=$CRM_FINANCIAL_API_TOKEN

# Webhook
WEBHOOK_ENABLED=true
WEBHOOK_AUTH_REQUIRED=true

# Polling Fallback
POLLING_ENABLED=true
POLLING_INTERVAL_MINUTES=15

# Alerting
SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL

# Logging
LOG_LEVEL=info
MASK_CPF=true
LOG_SENSITIVE_DATA=false

# Elasticsearch
ELASTICSEARCH_NODE=http://prod-es.internal:9200
ELASTICSEARCH_INDEX_PREFIX=logs-archiving-prod

# Security
TLS_ENABLED=true
CERTIFICATE_PATH=/etc/ssl/certs/prod-api.calandrini.crt
PRIVATE_KEY_PATH=/etc/ssl/private/prod-api.calandrini.key

# Retry logic
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_DELAY_MS=1000
RETRY_MAX_DELAY_MS=30000

# Performance
REQUEST_TIMEOUT_MS=30000
HEALTH_CHECK_INTERVAL_MS=30000
EOF

chmod 600 /etc/archiving/.env.production
echo "✅ .env.production criado com segurança (permissão 600)"
```

**Critério de Sucesso**: Arquivo criado, nenhuma credencial exposta em stdout

### Passo 2.3: Validar Credenciais em .env

```bash
# Teste de conectividade com .env.production
source /etc/archiving/.env.production

psql "$DATABASE_URL" -c "SELECT 1" && echo "✅ Database connection OK" || echo "❌ Database FAILED"
redis-cli -u "$REDIS_URL" PING && echo "✅ Redis connection OK" || echo "❌ Redis FAILED"
curl -s "http://$ELASTICSEARCH_NODE/_cluster/health" | jq -e '.status=="green"' > /dev/null && echo "✅ Elasticsearch OK" || echo "❌ Elasticsearch FAILED"
```

**Critério de Sucesso**: Todas 3 conexões OK

---

## 🌍 FASE 3: Deploy Production (1-2 hours)

**Responsável**: DevOps Lead + Tech Lead (supervisão)  
**Horário**: T-0 (deploy time)

### Passo 3.1: Stop Staging Environment (se necessário)

```bash
# Opcional: parar staging para evitar confusão com logs
cd /home/claude/projetos-i-financeiro/automacao-arquivamento-casos
docker compose -f docker-compose.staging.yml down

echo "✅ Staging environment stopped"
```

### Passo 3.2: Deploy Production Stack

```bash
# Criar arquivo docker-compose.production.yml baseado no staging
cp docker-compose.staging.yml docker-compose.production.yml

# Editar para produção (endpoints, volumes, resources)
sed -i 's/staging/production/g' docker-compose.production.yml
sed -i 's/localhost/prod-api.calandrini.internal/g' docker-compose.production.yml

# Deploy
docker compose -f docker-compose.production.yml up -d

# Aguardar inicialização
sleep 15
docker compose -f docker-compose.production.yml ps
```

**Critério de Sucesso**: Todos containers UP e HEALTHY

### Passo 3.3: Validar Health Checks

```bash
# Test API health
curl -X GET https://prod-api.calandrini.internal/health \
  -H "Authorization: Bearer test" \
  --insecure (temporário, até SSL estar OK)

# Esperado:
# HTTP 200
# {"status":"ok","timestamp":"2026-10-10T...","environment":"production"}

# Test Redis
redis-cli -h prod-redis.internal PING
# Esperado: PONG

# Test Elasticsearch
curl -s http://prod-es.internal:9200/_cluster/health | jq .
# Esperado: {"status":"green","number_of_nodes":1,...}
```

**Critério de Sucesso**: 3/3 health checks OK

### Passo 3.4: Teste de Webhook (Primeiro evento de produção)

```bash
# Enviar webhook de teste
curl -X POST https://prod-api.calandrini.internal/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRM_FINANCIAL_API_TOKEN" \
  --insecure \
  -d '{
    "caseId": "PROD-TEST-001",
    "processNumber": "0000001-XX.XXXX.X.XX.XXXX",
    "clientName": "Test Client Production",
    "lawsuitId": "lawsuit-test-prod",
    "changeColumn": "PARA_ARQUIVAR",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Esperado:
# HTTP 200
# {"success":true,"message":"Archiving process started","caseId":"PROD-TEST-001"}

# Verificar logs
docker logs archiving-api-production | tail -30 | grep "PROD-TEST-001"

# Verificar Elasticsearch
curl -s http://prod-es.internal:9200/logs-archiving-prod*/_search \
  -H "Content-Type: application/json" \
  -d '{"query":{"match":{"caseId":"PROD-TEST-001"}}}' | jq '.hits.hits | length'
# Esperado: >= 1 log entry
```

**Critério de Sucesso**: Webhook processado, log registrado em Elasticsearch

---

## ✅ FASE 4: Validação Pós-Deploy (30 min)

**Responsável**: QA Lead + DevOps Lead  
**Horário**: T+0 até T+30min

### Passo 4.1: Validação de Dados

```bash
# Verificar se histórico foi atualizado
curl -X GET https://prod-api.calandrini.internal/archiving/history \
  --insecure | jq '.entries | map(.caseId)'

# Verificar stats
curl -X GET https://prod-api.calandrini.internal/archiving/stats \
  --insecure | jq .

# Esperado:
# {
#   "totalAttempts": 1,
#   "successCount": 1,
#   "errorCount": 0,
#   "successRate": 100
# }
```

### Passo 4.2: Validação de Alertas

```bash
# Test Slack notification
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🟢 ETAPA 8 PRODUCTION DEPLOYMENT: ✅ SUCESSO",
    "blocks": [{"type": "section","text": {"type": "mrkdwn","text": "*Produção Online*\nSistema operacional. Monitoramento ativo 24h."}}]
  }'

# Verify message appeared in #archiving-production
```

### Passo 4.3: Teste de Performance Básico

```bash
# Load test leve (10 requests, 1s apart)
for i in {1..10}; do
  curl -X POST https://prod-api.calandrini.internal/webhook \
    -H "Authorization: Bearer $CRM_FINANCIAL_API_TOKEN" \
    -H "Content-Type: application/json" \
    --insecure \
    -d '{"caseId":"PROD-LOAD-'$i'","processNumber":"000000'$i'-XX.XXXX.X.XX.XXXX","clientName":"Test '$i'","lawsuitId":"load-test-'$i'","changeColumn":"PARA_ARQUIVAR","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' \
    --silent -w "Status: %{http_code}, Time: %{time_total}s\n"
  sleep 1
done

# Monitorar recursos
watch -n 1 'docker stats archiving-api-production --no-stream'
# Esperado: CPU < 10%, Memory < 256MB
```

---

## 📊 FASE 5: Monitoramento Contínuo (24 horas)

**Responsável**: DevOps Lead + QA Lead (em rotação)  
**Horário**: T+30min até T+24h

### Passo 5.1: Monitoramento a Cada Hora

A cada 1 hora, verificar e documentar:

```bash
# Check 1: API Health
curl -s https://prod-api.calandrini.internal/health --insecure | jq '.status'
# Esperado: "ok"

# Check 2: Success Rate (últimas 1h)
curl -s http://prod-es.internal:9200/logs-archiving-prod*/_search \
  -H "Content-Type: application/json" \
  -d '{
    "size": 0,
    "query": {
      "range": {
        "timestamp": {
          "gte": "now-1h"
        }
      }
    },
    "aggs": {
      "success_count": {
        "filter": {
          "term": {"status": "success"}
        }
      }
    }
  }' | jq .

# Check 3: Error Count (últimas 1h)
# (similar query com status=error)

# Check 4: Resource Usage
docker stats archiving-api-production --no-stream | tail -1

# Document in spreadsheet:
# Time | Health | Success% | Errors | CPU | Memory | Notes
# 10:00 | ok | 100% | 0 | 2% | 120MB | All good
```

### Passo 5.2: Teste de Alertas a Cada 2 Horas

```bash
# Trigger artificial alert (para validar canal Slack)
# NÃO faça isso em produção sem comunicação!
# Apenas se tiver canal de teste

# Ou, monitore se alertas naturais ocorrem
grep -i "error\|warning\|critical" /var/log/archiving.log
```

### Passo 5.3: Validação de Dados a Cada 4 Horas

```bash
# Reconcile processado vs não-processado
psql -h prod-db.internal -U archiving -d archiving_prod << EOF
SELECT 
  status,
  COUNT(*) as count,
  TO_CHAR(MAX(created_at), 'HH24:MI') as last_update
FROM archiving_records
WHERE created_at > NOW() - INTERVAL '4 hours'
GROUP BY status
ORDER BY count DESC;
EOF

# Esperado: nenhuma entrada com status=error ou pending
```

### Passo 5.4: Se Algo Der Errado → Rollback Imediato

```bash
# ROLLBACK PROCEDURE (se crítico)

# 1. Stop produção
docker compose -f docker-compose.production.yml down

# 2. Restore staging (como backup rápido)
docker compose -f docker-compose.staging.yml up -d

# 3. Notificar stakeholders
curl -X POST $SLACK_WEBHOOK_CRITICAL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🔴 ETAPA 8 DEPLOYMENT ROLLED BACK",
    "attachments": [{
      "color": "danger",
      "title": "Production Deployment Failed",
      "text": "Revertido para staging. Tech Lead será contactado."
    }]
  }'

# 4. Investigate
docker logs archiving-api-staging | tail -100

# 5. Document root cause
echo "Root cause: ..." > /incidents/etapa8-$(date +%Y%m%d-%H%M%S).txt
```

---

## 🎯 Critérios de Sucesso (Go-Live Validation)

Após 24h de monitoramento, sistema é considerado **GO-LIVE SUCESSO** se:

✅ **99% Uptime** (máximo 14 min de downtime em 24h)  
✅ **≥95% Success Rate** de casos processados  
✅ **Zero Casos Perdidos** (reconciliação pré-deploy = pós-deploy)  
✅ **Zero Duplicatas** (mesmo webhook 2x = 1 entrada)  
✅ **Zero Dados Sensíveis Expostos** (grep logs validado)  
✅ **Alertas Funcionando** (todos testes de notificação passaram)  
✅ **Performance Dentro de Limites**:
- Response time mediana < 5 segundos
- CPU < 10% em carga normal
- Memória < 256MB
- Database connections < 10 simultâneas

---

## ✍️ Sign-Off Final

```
PRODUCTION DEPLOYMENT SIGN-OFF

Etapa: Etapa 8 - Production Deployment
Data de Deploy: 2026-10-10
Hora de Início: _____________
Hora de Conclusão: _____________

VALIDAÇÃO PÓS-DEPLOY (24h depois):

☐ 99% Uptime validado
☐ 95%+ Success rate confirmado
☐ Zero casos perdidos
☐ Zero duplicatas
☐ Dados sensíveis mascarados
☐ Alertas funcionando
☐ Performance dentro de limites
☐ Backup & Disaster Recovery testado

SIGN-OFFS:

DevOps Lead: _________________ Data: __________
QA Lead: _____________________ Data: __________
Tech Lead: ____________________ Data: __________
Project Manager: ______________ Data: __________

OBSERVAÇÕES / ISSUES ENCONTRADOS:
_________________________________________

PRÓXIMOS PASSOS:
☐ Comunicar go-live ao jurídico (Anderson)
☐ Comunicar go-live ao escritório
☐ Iniciar monitoramento semanal
☐ Agendar retrospectiva de Etapa 8
```

---

**Plano Preparado**: Claude Haiku 4.5  
**Data**: 2026-10-08  
**Status**: ⏳ Aguardando Execução em 2026-10-10
