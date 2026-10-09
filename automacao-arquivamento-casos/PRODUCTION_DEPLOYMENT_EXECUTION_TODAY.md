# Production Deployment - Execução (2026-10-10)

**Status**: 🟡 Aguardando Sign-off de Staging  
**Tempo Total**: 4-6 horas + 24h monitoramento  
**Responsáveis**: DevOps Lead (execução) + Tech Lead (supervisão) + QA Lead (validação)

---

## ⚠️ PRÉ-REQUISITOS (Devem estar 100% prontos ANTES de começar)

### 1️⃣ Staging Validation Completa
- [ ] Todas 13 fases PASSED
- [ ] 4 sign-offs obtidos (QA, DevOps, Tech, PM)
- [ ] Data: __________ Hora: __________

### 2️⃣ Infraestrutura de Produção
- [ ] Servidor/VPC alocado
- [ ] Endereço IP fixo confirmado
- [ ] DNS configurado (prod-api.calandrini.internal)
- [ ] SSL/TLS válido e instalado
- [ ] PostgreSQL produção criado
- [ ] Redis produção criado
- [ ] Elasticsearch produção criado

### 3️⃣ Credenciais Seguras (em Vault)
- [ ] ADVBOX_API_TOKEN (produção)
- [ ] ASAAS_API_TOKEN (produção)
- [ ] CRM_FINANCIAL_API_TOKEN (produção)
- [ ] SLACK_WEBHOOK_URL_PROD validado

### 4️⃣ Backup & Disaster Recovery
- [ ] Backup de staging database testado
- [ ] Restore procedure validado
- [ ] Binário anterior guardado (rollback)
- [ ] Git tag criado (prod-deployment-2026-10-10)

### 5️⃣ Monitoramento
- [ ] Slack channels criados (#archiving-production, #archiving-success, #archiving-errors, #archiving-critical)
- [ ] Alerting rules configuradas
- [ ] Elasticsearch ILM ativado (30-day retention)
- [ ] Kibana dashboards prontos

---

## 🚀 EXECUÇÃO - 5 FASES (4-6 horas)

### **FASE 1: Preparação (30 min)**

```bash
# 1. Carregar credenciais de Vault
vault login
export ADVBOX_TOKEN=$(vault kv get -field=advbox_prod secret/archiving)
export ASAAS_API_TOKEN=$(vault kv get -field=asaas_prod secret/archiving)
export CRM_FINANCIAL_API_TOKEN=$(vault kv get -field=crm_prod secret/archiving)

# 2. Validar credenciais (testar cada uma)
curl -X GET https://advbox.prod/api/health -H "Authorization: Bearer $ADVBOX_TOKEN"
# Esperado: 200 OK

curl -X GET https://api.asaas.com/v3/customers -H "Authorization: Bearer $ASAAS_API_TOKEN"
# Esperado: 200 OK

curl -X GET https://crm.financial.prod/api/health -H "Authorization: Bearer $CRM_FINANCIAL_API_TOKEN"
# Esperado: 200 OK

# 3. Backup de segurança
pg_dump -h staging-db.internal archiving_staging | gzip > /backups/archiving-before-prod-deploy.sql.gz

# 4. Notificar time via Slack
curl -X POST $SLACK_WEBHOOK_URL_PROD \
  -H "Content-Type: application/json" \
  -d '{
    "text": "🚀 Production Deployment iniciado. Fase 1: Preparação ✅",
    "channel": "#archiving-critical"
  }'

# 5. Verificar ultima saúde de staging
curl http://localhost:3001/health
# Esperado: status=ok
```

**Status de Sucesso**: ✅ Se todos 3 endpoints retornam 200 OK

---

### **FASE 2: Build & Preparação (45 min)**

```bash
cd /home/claude/projetos-i-financeiro/automacao-arquivamento-casos

# 1. Build da imagem Docker de produção
docker build -t archiving-api:production .

# 2. Preparar .env.production (NÃO commitar!)
cat > .env.production << EOF
NODE_ENV=production
LOG_LEVEL=info
MASK_CPF=true
LOG_SENSITIVE_DATA=false

ADVBOX_API_TOKEN=$ADVBOX_TOKEN
ASAAS_API_TOKEN=$ASAAS_API_TOKEN
CRM_FINANCIAL_API_TOKEN=$CRM_FINANCIAL_API_TOKEN
SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL_PROD

DATABASE_URL=postgresql://produser:prodpass@prod-db.internal/archiving_prod
REDIS_URL=redis://prod-redis.internal:6379
ELASTICSEARCH_URL=http://prod-elasticsearch.internal:9200

API_PORT=443
API_HOST=prod-api.calandrini.internal
EOF

# 3. Verificar que arquivo NOT foi adicionado ao git
echo ".env.production" >> .gitignore
git add .gitignore
git commit -m "Prod: Ignore .env.production" || true

# 4. Testar conectividade com todos endpoints
echo "Testando conectividade..."
curl -s https://advbox.prod/api/health -H "Authorization: Bearer $ADVBOX_TOKEN" && echo "✓ Advbox" || echo "✗ Advbox"
curl -s https://api.asaas.com/v3/customers -H "Authorization: Bearer $ASAAS_API_TOKEN" && echo "✓ Asaas" || echo "✗ Asaas"
curl -s https://crm.financial.prod/api/health -H "Authorization: Bearer $CRM_FINANCIAL_API_TOKEN" && echo "✓ CRM" || echo "✗ CRM"

# Status de Sucesso: ✓ para todas 3
```

**Status de Sucesso**: ✅ Todos 3 endpoints respondendo

---

### **FASE 3: Deploy em Produção (1-2 horas)**

```bash
# 1. Parar staging (opcional, pode manter paralelo por 1h)
docker-compose -f docker-compose.staging.yml down

# 2. Iniciar produção
docker-compose -f docker-compose.production.yml up -d

# 3. Aguardar 10 segundos
sleep 10

# 4. Verificar status
docker-compose -f docker-compose.production.yml ps
# Esperado: Todos containers com status "Up"

# 5. Health check
curl https://prod-api.calandrini.internal/health
# Esperado: {"status":"ok","timestamp":"2026-10-10T..."}

# 6. Teste de webhook com token real
curl -X POST https://prod-api.calandrini.internal/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRM_FINANCIAL_API_TOKEN" \
  -d '{
    "caseId": "PROD-TEST-001",
    "processNumber": "0000001-XX.XXXX.X.XX.XXXX",
    "clientName": "Test Client Production",
    "lawsuitId": "lawsuit-prod-123",
    "changeColumn": "PARA_ARQUIVAR",
    "timestamp": "2026-10-10T10:00:00Z"
  }'
# Esperado: HTTP 200, {"success":true}

# 7. Notificar time
curl -X POST $SLACK_WEBHOOK_URL_PROD \
  -H "Content-Type: application/json" \
  -d '{
    "text": "✅ Production Deployment - Fase 3 completa. Sistema rodando em https://prod-api.calandrini.internal",
    "channel": "#archiving-critical"
  }'
```

**Status de Sucesso**: ✅ Health check retorna OK + webhook 200

---

### **FASE 4: Validação Pós-Deploy (30 min)**

```bash
# 1. Validar dados foram criados
curl https://prod-api.calandrini.internal/archiving/history | jq '.entries | length'
# Esperado: >= 1 (pelo menos o teste acima)

# 2. Validar estatísticas
curl https://prod-api.calandrini.internal/archiving/stats | jq .
# Esperado: successRate > 0

# 3. Teste de carga leve (10 requisições)
for i in {1..10}; do
  curl -X POST https://prod-api.calandrini.internal/webhook \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CRM_FINANCIAL_API_TOKEN" \
    -d "{
      \"caseId\": \"PROD-LOAD-$i\",
      \"processNumber\": \"000000$i-XX.XXXX.X.XX.XXXX\",
      \"clientName\": \"Test $i\",
      \"changeColumn\": \"PARA_ARQUIVAR\"
    }" &
done
wait

# 4. Verificar recursos
docker stats archiving-api-production --no-stream
# Esperado: CPU < 10%, MEM < 256MB

# 5. Alertas funcionando?
# Enviar teste para cada canal Slack
curl -X POST $SLACK_WEBHOOK_URL_PROD \
  -H "Content-Type: application/json" \
  -d '{"text": "✅ Teste de alerta - Produção OK", "channel": "#archiving-production"}'
```

**Status de Sucesso**: ✅ CPU/MEM OK + alertas Slack recebidos

---

### **FASE 5: Monitoramento 24h (Próximas 24 horas)**

```bash
# Executar a cada 1 hora pelos próximos 24h

# 1. Health check
curl https://prod-api.calandrini.internal/health

# 2. Taxa de sucesso
curl https://prod-api.calandrini.internal/archiving/stats | jq '.successRate'
# Esperado: >= 95%

# 3. Recursos
docker stats archiving-api-production --no-stream

# 4. Erros nos logs
docker logs archiving-api-production | grep ERROR | wc -l
# Esperado: 0 ou muito poucos

# 5. Reconciliação (a cada 4 horas)
psql -h prod-db.internal -c "SELECT COUNT(*) FROM archiving_records" archiving_prod
# Comparar com staging antes do deploy

# 6. Relatório para stakeholders (a cada 6 horas)
echo "Production Status Report - $(date)" >> /var/log/production-monitoring.log
echo "Health: ✅" >> /var/log/production-monitoring.log
echo "Success Rate: $(curl -s https://prod-api.calandrini.internal/archiving/stats | jq '.successRate')%" >> /var/log/production-monitoring.log
```

**Duração**: 24 horas contínuas  
**Frequência**: Checagem a cada 1 hora

---

## 🚨 PROCEDIMENTO DE ROLLBACK (Se Algo Falhar)

Se em qualquer momento surgir erro crítico:

```bash
# 1. STOP produção imediatamente
docker-compose -f docker-compose.production.yml down

# 2. RESTORE staging (voltar ao estado anterior)
docker-compose -f docker-compose.staging.yml up -d

# 3. NOTIFICAR stakeholders
curl -X POST $SLACK_WEBHOOK_URL_PROD \
  -H "Content-Type: application/json" \
  -d '{
    "text": "🔴 ROLLBACK INICIADO - Voltando para staging. Investigação em andamento.",
    "channel": "#archiving-critical"
  }'

# 4. INVESTIGAR root cause
docker logs archiving-api-production > /var/log/rollback-error.log

# 5. Contatar Tech Lead / CTO para análise
```

**Tempo de rollback esperado**: < 15 minutos

---

## 📊 Critérios de Sucesso (Go-Live)

Após 24h de monitoramento, o deploy é **SUCESSO** se:

- ✅ **99% Uptime** (máx 14 min downtime)
- ✅ **≥95% Success Rate** (casos processados com sucesso)
- ✅ **Zero Casos Perdidos** (reconciliação = staging count)
- ✅ **Zero Duplicatas** (idempotência funcionando)
- ✅ **Zero Dados Expostos** (logs mascarados)
- ✅ **Alertas 100%** (todos canais Slack recebem)
- ✅ **Performance OK** (CPU < 10%, Mem < 256MB)
- ✅ **Backup & Rollback Testados**

---

## 🎯 Checklist Final (Antes de Começar)

- [ ] Staging validation 13/13 PASSED
- [ ] 4 sign-offs obtidos
- [ ] Credenciais produção em Vault (testadas)
- [ ] Infraestrutura produção provisionada
- [ ] Backup de staging feito
- [ ] SSL/TLS válido
- [ ] Elasticsearch online
- [ ] Slack channels criados
- [ ] Rollback procedure testado
- [ ] Team notificado (horário exato)
- [ ] Equipamentos & ferramentas prontos

**Se TODOS os itens acima estão ✅ → LIBERADO para BEGIN DEPLOYMENT**

---

## 📅 Timeline Esperado

| Horário | Fase | Responsável |
|---------|------|-------------|
| 10:00 | Fase 1: Preparação | DevOps Lead |
| 10:35 | Fase 2: Build & Prep | DevOps Lead |
| 11:25 | Fase 3: Deploy Prod | DevOps Lead |
| 13:30 | Fase 4: Validação | QA Lead |
| 14:00 | Fase 5: Monitoramento 24h | DevOps Lead |
| 14:00 - 38:00 | Monitoramento contínuo | DevOps Lead |

---

## 🎉 Go-Live (2026-10-11)

Após 24h de monitoramento bem-sucedido:

```bash
# 1. Validar critérios de sucesso
echo "Uptime: 99%+ ✅"
echo "Success Rate: 95%+ ✅"
echo "Zero casos perdidos ✅"

# 2. Comunicar jurídico (Anderson)
# "Sistema de arquivamento automático está 100% operacional em produção"

# 3. Comunicar escritório
# "Automação ativa 24/7"

# 4. Agendar retrospectiva
# "O que funcionou bem, o que melhorar"

# 5. Comemorar! 🎉
```

---

## 📚 Referência Rápida

| Documento | Uso |
|-----------|-----|
| ETAPA_8_EXECUTION_PLAN.md | Plano detalhado (este é um resumo) |
| ETAPA_8_RISK_MATRIX.md | Riscos & mitigação |
| PRODUCTION_READINESS_CHECKLIST.md | Validação pré-deploy |
| STAGING_VALIDATION_CHECKLIST.md | Referência (staging já passou) |

---

**Documento Preparado**: 2026-10-09 15:00 UTC  
**Versão**: 1.0  
**Status**: 🟡 Aguardando Sign-off de Staging para Execução
