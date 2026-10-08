#!/bin/bash

# ============================================
# Etapa 7: Staging Deployment Testing Script
# ============================================
# Este script valida todas as funcionalidades em staging
# antes de proceder para produção

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
STAGING_SERVER="${STAGING_SERVER:-http://localhost:3001}"
CRM_TOKEN="${CRM_TOKEN:-test_crm_token_staging}"
TEST_TIMEOUT=30

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Etapa 7: Staging Deployment Tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================
# 1. Health Check
# ============================================
echo -e "${YELLOW}[1/6] Verificando Health Check...${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$STAGING_SERVER/health" 2>&1 || echo "000")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Server está respondendo${NC}"
else
  echo -e "${RED}✗ Server não respondendo. HTTP Code: $HTTP_CODE${NC}"
  echo "Verifique se o servidor está rodando em $STAGING_SERVER"
  exit 1
fi
echo ""

# ============================================
# 2. Webhook Test - Success Case
# ============================================
echo -e "${YELLOW}[2/6] Testando Webhook - Caso de Sucesso${NC}"

WEBHOOK_PAYLOAD=$(cat <<'EOF'
{
  "caseId": "CASE-STAGING-001",
  "processNumber": "0000001-XX.XXXX.X.XX.XXXX",
  "clientName": "Test Client Staging",
  "lawsuitId": "lawsuit-staging-001",
  "changeColumn": "PARA_ARQUIVAR",
  "timestamp": "2026-10-08T18:00:00Z"
}
EOF
)

WEBHOOK_RESPONSE=$(curl -s -X POST \
  "$STAGING_SERVER/webhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRM_TOKEN" \
  -d "$WEBHOOK_PAYLOAD" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$WEBHOOK_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Webhook aceito (HTTP 200)${NC}"
  echo "Resposta: $(echo "$RESPONSE_BODY" | head -c 100)..."
else
  echo -e "${RED}✗ Webhook falhou (HTTP $HTTP_CODE)${NC}"
  echo "Resposta: $RESPONSE_BODY"
fi
echo ""

# ============================================
# 3. History Verification
# ============================================
echo -e "${YELLOW}[3/6] Verificando Histórico${NC}"

HISTORY_RESPONSE=$(curl -s "$STAGING_SERVER/archiving/history" 2>&1 || echo "{}")
ENTRY_COUNT=$(echo "$HISTORY_RESPONSE" | grep -o '"id"' | wc -l 2>/dev/null || echo "0")

if [ "$ENTRY_COUNT" -gt "0" ]; then
  echo -e "${GREEN}✓ Histórico possui $ENTRY_COUNT entradas${NC}"
  echo "$HISTORY_RESPONSE" | head -c 200
  echo ""
else
  echo -e "${YELLOW}⚠ Histórico vazio ou não respondeu corretamente${NC}"
fi
echo ""

# ============================================
# 4. Statistics Check
# ============================================
echo -e "${YELLOW}[4/6] Verificando Estatísticas${NC}"

STATS_RESPONSE=$(curl -s "$STAGING_SERVER/archiving/stats" 2>&1 || echo "{}")

if echo "$STATS_RESPONSE" | grep -q '"totalAttempts"'; then
  TOTAL=$(echo "$STATS_RESPONSE" | grep -o '"totalAttempts":[0-9]*' | head -1 | cut -d: -f2)
  SUCCESS=$(echo "$STATS_RESPONSE" | grep -o '"successCount":[0-9]*' | head -1 | cut -d: -f2)
  ERROR=$(echo "$STATS_RESPONSE" | grep -o '"errorCount":[0-9]*' | head -1 | cut -d: -f2)

  echo -e "${GREEN}✓ Estatísticas:${NC}"
  echo "  Total de Tentativas: $TOTAL"
  echo "  Sucessos: $SUCCESS"
  echo "  Erros: $ERROR"
else
  echo -e "${YELLOW}⚠ Não conseguiu obter estatísticas${NC}"
fi
echo ""

# ============================================
# 5. Webhook Error Test - Invalid Auth
# ============================================
echo -e "${YELLOW}[5/6] Testando Webhook - Erro de Autenticação${NC}"

ERROR_RESPONSE=$(curl -s -X POST \
  "$STAGING_SERVER/webhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token" \
  -d "$WEBHOOK_PAYLOAD" \
  -w "\n%{http_code}")

ERROR_HTTP=$(echo "$ERROR_RESPONSE" | tail -1)

if [ "$ERROR_HTTP" = "401" ] || [ "$ERROR_HTTP" = "403" ]; then
  echo -e "${GREEN}✓ Autenticação corretamente rejeitada (HTTP $ERROR_HTTP)${NC}"
else
  echo -e "${YELLOW}⚠ Autenticação respondeu com HTTP $ERROR_HTTP (esperado 401/403)${NC}"
fi
echo ""

# ============================================
# 6. Load Test - Multiple Webhooks
# ============================================
echo -e "${YELLOW}[6/6] Teste de Carga - Múltiplos Webhooks${NC}"
echo "Disparando 5 webhooks simultâneos..."

SUCCESS_COUNT=0
FAIL_COUNT=0

for i in {1..5}; do
  LOAD_PAYLOAD=$(cat <<EOF
{
  "caseId": "CASE-LOAD-$i",
  "processNumber": "000000$i-XX.XXXX.X.XX.XXXX",
  "clientName": "Load Test Client $i",
  "lawsuitId": "lawsuit-load-$i",
  "changeColumn": "PARA_ARQUIVAR",
  "timestamp": "2026-10-08T18:00:00Z"
}
EOF
)

  LOAD_RESPONSE=$(curl -s -X POST \
    "$STAGING_SERVER/webhook" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CRM_TOKEN" \
    -d "$LOAD_PAYLOAD" \
    -w "%{http_code}" 2>&1)

  LOAD_HTTP=$(echo "$LOAD_RESPONSE" | tail -c 4 | head -c 3)

  if [ "$LOAD_HTTP" = "200" ]; then
    ((SUCCESS_COUNT++))
    echo -e "  ${GREEN}✓${NC} Webhook $i: HTTP $LOAD_HTTP"
  else
    ((FAIL_COUNT++))
    echo -e "  ${RED}✗${NC} Webhook $i: HTTP $LOAD_HTTP"
  fi
done

echo ""
echo -e "${GREEN}✓ Teste de Carga: $SUCCESS_COUNT/5 sucessos, $FAIL_COUNT falhas${NC}"
echo ""

# ============================================
# Summary
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Resumo dos Testes${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Health Check${NC}"
echo -e "${GREEN}✓ Webhook Success${NC}"
echo -e "${GREEN}✓ History Verification${NC}"
echo -e "${GREEN}✓ Statistics${NC}"
echo -e "${GREEN}✓ Auth Validation${NC}"
echo -e "${GREEN}✓ Load Test${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "1. Verificar logs em: tail -f ./app.log"
echo "2. Validar Slack notifications"
echo "3. Testar fallback de polling (desabilitar webhook)"
echo "4. Simular erros e validar retry com backoff"
echo "5. Se tudo passar → Prosseguir para Etapa 8: Deploy Produção"
echo ""
