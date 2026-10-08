# Etapa 7: Staging Deployment - Quick Start Guide

**Objetivo**: Validar o sistema de automação de arquivamento em ambiente staging antes de produção.

**Tempo Estimado**: 2-3 horas  
**Pré-requisitos**: Docker, Docker Compose, curl, bash

---

## 1️⃣ Preparação Rápida (5 min)

### 1.1 Verificar Pré-requisitos
```bash
# Verificar Docker
docker --version
docker-compose --version

# Verificar curl
curl --version

# Verificar acesso ao repositório
cd /home/claude/projetos-i-financeiro/automacao-arquivamento-casos
git status
```

### 1.2 Verificar Ambiente
```bash
# Verificar arquivo .env.staging existe
ls -la .env.staging

# Verificar testes passam
npm test

# Output esperado:
# ✓ Test Files  3 passed (3)
# ✓ Tests  51 passed (51)
```

**Status**: ✅ Pronto para continuar

---

## 2️⃣ Build & Deploy (10 min)

### 2.1 Build da Aplicação
```bash
# Build Docker image
docker build -t archiving-api:staging .

# Ou build com docker-compose
docker-compose -f docker-compose.staging.yml build
```

### 2.2 Iniciar Containers
```bash
# Iniciar stack completa (API + Redis + Elasticsearch + Kibana)
docker-compose -f docker-compose.staging.yml up -d

# Verificar status
docker-compose -f docker-compose.staging.yml ps

# Output esperado:
# NAME                        STATUS
# archiving-api-staging       Up 10s (healthy)
# redis-staging              Up 10s
# elasticsearch-staging      Up 10s
# kibana-staging             Up 10s
```

### 2.3 Health Check
```bash
# Aguardar 5 segundos para aplicação iniciar
sleep 5

# Verificar saúde
curl http://localhost:3001/health

# Output esperado:
# {"status":"ok","timestamp":"2026-10-08T18:00:00Z"}
```

**Status**: ✅ Staging deployado com sucesso

---

## 3️⃣ Testes Rápidos (15 min)

### 3.1 Executar Test Suite
```bash
# Teste automatizado de webhook e endpoints
./scripts/staging-test.sh

# Output esperado:
# ✓ Health Check
# ✓ Webhook Success
# ✓ History Verification
# ✓ Statistics
# ✓ Auth Validation
# ✓ Load Test
```

### 3.2 Teste Manual de Webhook
```bash
# Enviar webhook simulado
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_crm_token_staging" \
  -d '{
    "caseId": "CASE-001",
    "processNumber": "0000001-XX.XXXX.X.XX.XXXX",
    "clientName": "Test Client",
    "lawsuitId": "lawsuit-123",
    "changeColumn": "PARA_ARQUIVAR",
    "timestamp": "2026-10-08T18:00:00Z"
  }'

# Output esperado:
# HTTP 200
# {"success":true,"message":"Archiving process started","caseId":"CASE-001"}
```

### 3.3 Verificar Histórico
```bash
# Ver histórico de execuções
curl http://localhost:3001/archiving/history | jq .

# Ver estatísticas
curl http://localhost:3001/archiving/stats | jq .

# Output esperado:
# {
#   "totalAttempts": 1,
#   "successCount": 1,
#   "errorCount": 0,
#   "successRate": 100
# }
```

**Status**: ✅ Webhooks e endpoints funcionando

---

## 4️⃣ Monitoramento (5 min)

### 4.1 Ver Logs em Real-time
```bash
# Logs da aplicação
docker logs -f archiving-api-staging

# Procurar por erros
docker logs archiving-api-staging | grep ERROR
```

### 4.2 Acessar Kibana
```
Abrir navegador: http://localhost:5601

1. Ir para "Stack Management" → "Index Patterns"
2. Criar index pattern: logs-archiving-*
3. Ir para "Discover"
4. Visualizar logs
```

### 4.3 Verificar Redis
```bash
# Conectar ao Redis
redis-cli -p 6379

# Ping para verificar
> PING
PONG

# Ver cache keys
> KEYS "archiving:*"
```

**Status**: ✅ Monitoramento configurado

---

## 5️⃣ Teste de Carga (10 min)

### 5.1 Executar Load Test
```bash
# Teste com 50 requisições simultâneas
./scripts/staging-load-test.sh 50 30

# Aguardar conclusão (~30s)
# Output esperado:
# Taxa de sucesso: >= 95%
# Requisições/segundo: >= 10
```

### 5.2 Monitorar Recursos
```bash
# Abrir em outro terminal
watch -n 1 'docker stats archiving-api-staging'

# Verificar:
# CPU: < 10%
# Memória: < 256MB
```

**Status**: ✅ Sistema estável sob carga

---

## 6️⃣ Validação Completa (30 min)

### 6.1 Marcar Checklist
```bash
# Abrir documento
cat STAGING_VALIDATION_CHECKLIST.md

# Seguir cada fase e marcar ✓:
# - Phase 1: Environment Setup
# - Phase 2: Deployment to Staging  
# - Phase 3: Webhook Integration Tests
# - Phase 4: Data Verification
# - Phase 5: Slack Notifications
# - Phase 6: Retry & Backoff Testing
# - Phase 7: Polling Fallback Testing
# - Phase 8: Error Handling & Recovery
# - Phase 9: Load Testing
# - Phase 10: Monitoring Validation
# - Phase 11: Data Integrity Tests
# - Phase 12: Performance Benchmarks
# - Phase 13: Documentation Review
```

### 6.2 Checklist Rápido (passar em todos)
- [ ] 51/51 testes passam
- [ ] Webhook recebe POST e retorna 200
- [ ] Tarefa criada em Advbox
- [ ] Histórico persistido
- [ ] Slack notificações funcionam
- [ ] Retry com backoff funcionando
- [ ] Polling fallback testado
- [ ] Load test: 95% sucesso
- [ ] Logs no Elasticsearch
- [ ] Kibana mostrando dados
- [ ] Monitoramento OK
- [ ] Nenhum erro em 1 hora
- [ ] Documentação OK

**Status**: ✅ Validação Completa

---

## 7️⃣ Troubleshooting Rápido

### Problema: Container não inicia
```bash
# Ver logs de erro
docker logs archiving-api-staging

# Verificar se porta 3001 está em uso
lsof -i :3001

# Se necessário, matar processo
kill -9 <PID>

# Reiniciar containers
docker-compose -f docker-compose.staging.yml restart
```

### Problema: Webhook retorna 401
```bash
# Verificar token em .env.staging
grep CRM_FINANCIAL_API_TOKEN .env.staging

# Verificar cabeçalho Authorization
# Deve ser: "Bearer <token>"
```

### Problema: Redis não conecta
```bash
# Verificar se Redis está rodando
docker ps | grep redis

# Verificar logs
docker logs redis-staging

# Reconectar ao container
docker-compose -f docker-compose.staging.yml restart redis-staging
```

### Problema: Elasticsearch vazio
```bash
# Verificar índices
curl http://localhost:9200/_cat/indices

# Se vazio, aplicação pode não estar logando
# Verificar variável LOG_LEVEL em .env.staging
# Deve ser LOG_LEVEL=debug
```

---

## 8️⃣ Próximas Etapas

✅ **Staging validado com sucesso?**

### Sim → Proceder para Produção
```bash
# 1. Obter sign-off de todos
# 2. Ler PRODUCTION_DEPLOYMENT.md
# 3. Preparar credenciais de produção
# 4. Executar Etapa 8: Deploy Produção

cat PRODUCTION_DEPLOYMENT.md
```

### Não → Investigar Falhas
```bash
# 1. Executar novamente ./scripts/staging-test.sh
# 2. Revisar logs: docker logs archiving-api-staging
# 3. Checar STAGING_MONITORING.md para diagnosticar
# 4. Corrigir issue
# 5. Voltar ao passo 1
```

---

## 📊 Resumo de Arquivos

| Arquivo | Propósito |
|---------|-----------|
| `.env.staging` | Configurações de staging (credenciais teste) |
| `Dockerfile` | Container da aplicação |
| `docker-compose.staging.yml` | Stack completa (API + Redis + ELK) |
| `scripts/staging-test.sh` | Teste rápido de 6 cenários |
| `scripts/staging-load-test.sh` | Teste de carga com métricas |
| `STAGING_VALIDATION_CHECKLIST.md` | 13 fases de validação detalhadas |
| `docs/STAGING_MONITORING.md` | Guia de monitoramento e alertas |

---

## 🎯 Checklist de Sign-off

Antes de proceder para produção, obter sign-off:

- [ ] **QA Lead**: Validação de funcionalidades
  - Nome: _____________
  - Data: ______________
  
- [ ] **DevOps Lead**: Infraestrutura e monitoring
  - Nome: _____________
  - Data: ______________
  
- [ ] **Technical Lead**: Qualidade de código
  - Nome: _____________
  - Data: ______________
  
- [ ] **Project Manager**: Timeline e escalação
  - Nome: _____________
  - Data: ______________

---

## 📞 Suporte

Problemas durante o staging?

1. **Revisar logs**: `docker logs archiving-api-staging`
2. **Consultar guias**: 
   - STAGING_MONITORING.md (diagnóstico)
   - STAGING_VALIDATION_CHECKLIST.md (procedimento)
3. **Contatar time técnico**: CTO / Technical Lead
4. **Escalação**: Project Manager se timeline em risco

---

**Tempo Total Estimado**: 2-3 horas  
**Documento Criado**: 2026-10-08  
**Versão**: 1.0
