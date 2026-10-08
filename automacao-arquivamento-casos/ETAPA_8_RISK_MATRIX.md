# Etapa 8: Risk Matrix & Mitigation Plan

**Data**: 2026-10-08  
**Etapa**: Etapa 8 - Production Deployment  
**Status**: ⏳ Identificação de Riscos Completa

---

## 🎯 Risco vs Impacto vs Probabilidade

| # | Risco Identificado | Severidade | Probabilidade | Impacto | Mitigação | Dono |
|---|---|---|---|---|---|---|
| **R1** | Falha de autenticação com APIs externas (Advbox, Asaas) | 🔴 CRÍTICA | Média (30%) | Casos não processados | Validar credenciais 24h antes; Rollback automático | DevOps |
| **R2** | Perda de dados de casos durante transição | 🔴 CRÍTICA | Baixa (5%) | Clientes afetados, compliance | Backup/restore testado; reconciliação pré-pos deploy | DevOps |
| **R3** | Exposição de dados sensíveis (CPF, números de conta) em logs | 🔴 CRÍTICA | Baixa (10%) | Breach de segurança | MASK_CPF=true; grep logs antes de go-live | DevOps |
| **R4** | Webhook duplicado (múltiplos recebimentos do mesmo evento) | 🟠 ALTA | Média (40%) | Tarefas duplicadas, retrabalho | Idempotência verificada; test 5x webhook idêntico | QA |
| **R5** | Fallback polling ativa incorretamente | 🟠 ALTA | Baixa (15%) | Processamento duplicado por webhook + polling | TEST: WEBHOOK_ENABLED=false, validar polling 15min | QA |
| **R6** | Rate limit das APIs externas (Advbox, Asaas) atingido | 🟠 ALTA | Média (35%) | Casos retidos, fila cresce | Implementar backoff exponencial; monitorar fila | DevOps |
| **R7** | Elasticsearch índices crescem demais | 🟠 ALTA | Média (30%) | Disco cheio, sistema lento | ILM (Index Lifecycle Management) ativado; 30-day retention | DevOps |
| **R8** | Slack webhook URL errada ou outdated | 🟡 MÉDIA | Baixa (10%) | Equipe não recebe alertas | Validar webhook 24h antes; teste manual | DevOps |
| **R9** | Memory leak em Node.js → OOM kill | 🟡 MÉDIA | Média (25%) | Serviço reinicia, casos perdidos (se sem persistência) | Memory limit 256MB; health check restart; monitoring | DevOps |
| **R10** | Database connection pool exhausted | 🟡 MÉDIA | Baixa (15%) | Novas requisições falham; queue backlogs | Pool size tuning; connection timeout 30s; monitoring | DevOps |
| **R11** | Certificate SSL/TLS expirado | 🟡 MÉDIA | Baixa (5%) | API inacessível (HTTPS fails) | Auto-renewal certbot + systemd timer; monitoring | DevOps |
| **R12** | Fallback de rollback falha | 🔴 CRÍTICA | Baixa (5%) | Sistema não volta a staging; indefinido downtime | Teste rollback procedure; manter 2 binários | DevOps |
| **R13** | Tech Lead / DevOps Lead indisponível durante deploy | 🟠 ALTA | Baixa (10%) | Delay ou erro não escalado | Escalação documentada; backup person nomeado | PM |
| **R14** | Monitoramento/alertas não funcionam (Kibana down) | 🟡 MÉDIA | Baixa (15%) | Issues não detectadas por 4+ horas | Redundância de alertas (Slack + Email); monitoramento do monitor | DevOps |

---

## 🛡️ Mitigação Detalhada por Risco

### R1: Falha de Autenticação (CRÍTICA)

**Cenário**: Credenciais de produção inválidas ou expiradas → APIs rejeitam requisições → casos não processados.

**Ação Mitigadora**:
```bash
# 24h antes do deploy
vault login
export ADVBOX_TOKEN=$(vault kv get -field=advbox_prod secret/archiving)
export ASAAS_API_TOKEN=$(vault kv get -field=asaas_prod secret/archiving)
export CRM_FINANCIAL_API_TOKEN=$(vault kv get -field=crm_prod secret/archiving)

# Test cada uma
curl -X GET https://advbox.prod/api/health -H "Authorization: Bearer $ADVBOX_TOKEN"
# Esperado: 200 OK

curl -X GET https://api.asaas.com/v3/customers -H "Authorization: Bearer $ASAAS_API_TOKEN"
# Esperado: 200 OK

curl -X GET https://crm.financial.prod/api/health -H "Authorization: Bearer $CRM_FINANCIAL_API_TOKEN"
# Esperado: 200 OK
```

**Rollback Automático**: Se qualquer API falhar 5x consecutivas → alerta crítico → rollback automático ativo.

---

### R2: Perda de Dados (CRÍTICA)

**Cenário**: PostgreSQL de staging para produção tem inconsistência → dados perdidos na transição.

**Ação Mitigadora**:
```bash
# 1. Backup de staging antes
pg_dump -h staging-db.internal archiving_staging | gzip > /backups/archiving-before-prod-deploy.sql.gz

# 2. Restore em prod + teste
gunzip < /backups/archiving-before-prod-deploy.sql.gz | psql -h prod-db.internal archiving_prod

# 3. Reconciliação
# Count linhas em staging
psql -h staging-db.internal -c "SELECT COUNT(*) FROM archiving_records" archiving_staging

# Count linhas em prod
psql -h prod-db.internal -c "SELECT COUNT(*) FROM archiving_records" archiving_prod

# Deve ser igual! Se não, investigar antes de go-live
```

**Pré-Deploy Checklist**: Count(staging) == Count(prod)

---

### R3: Exposição de Dados Sensíveis (CRÍTICA)

**Cenário**: CPF de cliente ou número de conta aparece em logs → compliance violation.

**Ação Mitigadora**:
```bash
# Validar mascaramento em .env.production
grep MASK_CPF .env.production
# Esperado: MASK_CPF=true

grep LOG_SENSITIVE_DATA .env.production
# Esperado: LOG_SENSITIVE_DATA=false

# Grep logs por padrões sensíveis
docker logs archiving-api-production | grep -E '[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}' && echo "❌ CPF FOUND!" || echo "✅ CPF masked"
docker logs archiving-api-production | grep -E '[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}' && echo "❌ CARD FOUND!" || echo "✅ Cards masked"
```

**Teste Manual**: Enviar webhook com CPF real, verificar se aparece em logs.

---

### R4: Webhook Duplicado (ALTA)

**Cenário**: CRM Financial envia mesmo webhook 2x (retry ou bug) → 2 tarefas criadas em Advbox.

**Ação Mitigadora**:
```bash
# Testar idempotência: enviar mesmo webhook 5x
for i in {1..5}; do
  curl -X POST https://prod-api/webhook \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"caseId":"IDEMPOTENT-001","..."}'
done

# Validar: histórico deve ter apenas 1 entrada
curl -X GET https://prod-api/archiving/history | jq '.entries[] | select(.caseId=="IDEMPOTENT-001") | .caseId' | wc -l
# Esperado: 1 (não 5!)

# Advbox também deve ter apenas 1 tarefa
curl -X GET "https://advbox.prod/api/tasks?externalId=IDEMPOTENT-001" -H "Authorization: Bearer $ADVBOX_TOKEN" | jq '.items | length'
# Esperado: 1
```

**Implementação**: Hash do webhook (caseId + timestamp) guardado em Redis com TTL 24h.

---

### R5: Fallback Polling Ativa Errado (ALTA)

**Cenário**: WEBHOOK_ENABLED=true mas polling também ativa → mesmo caso processado 2x (webhook + polling 15min depois).

**Ação Mitigadora**:
```bash
# Teste 1: WEBHOOK_ENABLED=true, POLLING_ENABLED=true
# Enviar webhook, aguardar 16 minutos
# Validar: apenas 1 entrada no histórico (não 2)

# Teste 2: WEBHOOK_ENABLED=false, POLLING_ENABLED=true
# Aguardar 15 minutos
# Validar: polling busca e processa caso

# Teste 3: WEBHOOK_ENABLED=true, POLLING_ENABLED=false
# Enviar webhook
# Parar webhook, aguardar 30 minutos
# Validar: polling NÃO ativa (caso não deve ser reprocessado)
```

---

### R6: Rate Limit Atingido (ALTA)

**Cenário**: Advbox tem limit de 10 req/s → temos spike de 50 webhooks/minuto → rate limited → queue cresce.

**Ação Mitigadora**:
```bash
# Implementar exponential backoff (já existe no código)
// Retry: 1s → 2s → 4s → stop

// Monitorar fila
curl -X GET https://prod-api/archiving/queue-depth | jq '.pending_count'
// Se > 100: alerta WARNING
// Se > 500: alerta CRITICAL

// Implementar circuit breaker
// Se Advbox retorna 429 (Too Many Requests) 3x → pause por 60s, depois retry
```

---

### R12: Rollback Falha (CRÍTICA)

**Cenário**: Situação crítica detectada → tentamos rollback → rollback também falha → sistema indefinido.

**Ação Mitigadora**:
```bash
# Teste rollback procedure ANTES de deploy

# 1. Manter binário anterior em /opt/archiving/bin/old
docker save archiving-api:staging -o /opt/archiving/bin/archiving-staging.tar

# 2. Teste rollback
docker compose -f docker-compose.production.yml down
docker load -i /opt/archiving/bin/archiving-staging.tar
docker compose -f docker-compose.staging.yml up -d

# 3. Validar staging está UP e saudável
docker compose -f docker-compose.staging.yml ps
curl http://localhost:3001/health

# 4. Git tag antes de deploy
git tag prod-deployment-2026-10-10
git push origin prod-deployment-2026-10-10

# Rollback via git
git reset --hard prod-deployment-2026-10-10
```

---

## 📈 Matriz de Decisão: Bloqueadores para Go-Live

| Condição | Status | Bloqueador? | Ação |
|---|---|---|---|
| Staging validation 13/13 PASSED | ⏳ Aguardando (2026-10-09) | SIM | Bloqueado até passar |
| 4 sign-offs obtidos | ⏳ Aguardando | SIM | Bloqueado até obter |
| Credenciais produção validadas | ⏳ Aguardando | SIM | Bloqueado até validar |
| Backup staging testado | ⏳ Aguardando | SIM | Bloqueado até testar restore |
| Dados sensíveis mascarados | ⏳ Aguardando | SIM | Bloqueado até validar grep |
| Certificate SSL válido | ⏳ Aguardando | SIM | Bloqueado até ter cert |
| Elasticsearch online | ⏳ Aguardando | SIM | Bloqueado até estar green |
| Rollback procedure testado | ⏳ Aguardando | SIM | Bloqueado até testar |

**GO-LIVE LIBERADO QUANDO**: Todas condições acima = ✅

---

## 📞 Escalação (Se Algo Der Errado)

### Nível 1: Técnico (DevOps/QA)
- Issue: API retorna 500
- Ação: Verificar logs, restart container, check database
- Timeout: 15 minutos
- Escalação: Se não resolvido → Nível 2

### Nível 2: Tech Lead
- Issue: Múltiplos containers falham, dados inconsistentes
- Ação: Avaliar rollback vs fix forward
- Timeout: 30 minutos
- Escalação: Se não resolvido → Nível 3

### Nível 3: CTO / PM
- Issue: Rollback também falha, jurídico afetado
- Ação: Comunicar situação, contingency plan
- Timeout: imediato, comunicação

---

**Risk Matrix Preparada**: Claude Haiku 4.5  
**Data**: 2026-10-08  
**Próximo Passo**: Executar validações 24h antes do deploy (2026-10-09)
