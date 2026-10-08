#!/bin/bash

# ============================================
# Staging Load Test Script
# ============================================
# Simulates multiple concurrent webhook requests
# to validate system stability under load

set -e

# Configuration
STAGING_SERVER="${STAGING_SERVER:-http://localhost:3001}"
CRM_TOKEN="${CRM_TOKEN:-test_crm_token_staging}"
CONCURRENT_REQUESTS=${1:-50}
TEST_DURATION_SECONDS=${2:-30}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Staging Load Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Servidor: $STAGING_SERVER"
echo "Requisições Simultâneas: $CONCURRENT_REQUESTS"
echo "Duração: $TEST_DURATION_SECONDS segundos"
echo ""

# Variables for tracking
START_TIME=$(date +%s)
SUCCESS_COUNT=0
FAIL_COUNT=0
TIMEOUT_COUNT=0
TOTAL_REQUESTS=0

# Function to send webhook
send_webhook() {
  local request_id=$1
  local case_id="CASE-LOAD-$request_id"
  local process_num="$(printf '%07d' $request_id)-XX.XXXX.X.XX.XXXX"
  local client_name="Load Test Client $request_id"

  local payload=$(cat <<EOF
{
  "caseId": "$case_id",
  "processNumber": "$process_num",
  "clientName": "$client_name",
  "lawsuitId": "lawsuit-load-$request_id",
  "changeColumn": "PARA_ARQUIVAR",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

  local response=$(curl -s -X POST \
    "$STAGING_SERVER/webhook" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CRM_TOKEN" \
    -d "$payload" \
    -w "\n%{http_code}" \
    --max-time 10 2>&1 || echo "000")

  local http_code=$(echo "$response" | tail -1)

  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓${NC} Req $request_id: HTTP 200"
    ((SUCCESS_COUNT++))
  elif [ "$http_code" = "000" ]; then
    echo -e "${YELLOW}⏱${NC} Req $request_id: TIMEOUT"
    ((TIMEOUT_COUNT++))
  else
    echo -e "${RED}✗${NC} Req $request_id: HTTP $http_code"
    ((FAIL_COUNT++))
  fi
}

# Export variables for parallel execution
export STAGING_SERVER CRM_TOKEN
export -f send_webhook
export SUCCESS_COUNT FAIL_COUNT TIMEOUT_COUNT

echo -e "${YELLOW}Iniciando teste de carga...${NC}"
echo ""

# Create temporary file for tracking
TEMP_FILE="/tmp/load_test_$$.txt"
rm -f "$TEMP_FILE"

# Send concurrent requests
REQUEST_ID=1
ACTIVE_JOBS=0
BATCH_SIZE=$CONCURRENT_REQUESTS

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  if [ $ELAPSED -ge $TEST_DURATION_SECONDS ]; then
    echo ""
    echo -e "${YELLOW}Tempo de teste expirado, aguardando conclusão...${NC}"
    break
  fi

  # Send batches of requests
  for i in $(seq 1 $BATCH_SIZE); do
    if [ $ELAPSED -lt $TEST_DURATION_SECONDS ]; then
      send_webhook "$REQUEST_ID" >> "$TEMP_FILE" 2>&1 &
      ((REQUEST_ID++))
      ((ACTIVE_JOBS++))
    fi
  done

  # Wait for batch to complete or timeout
  wait
  ACTIVE_JOBS=0
done

# Wait for any remaining jobs
wait 2>/dev/null || true

TOTAL_REQUESTS=$((REQUEST_ID - 1))
TOTAL_TIME=$(($(date +%s) - START_TIME))

# Read results from file
if [ -f "$TEMP_FILE" ]; then
  SUCCESS_COUNT=$(grep -c "HTTP 200" "$TEMP_FILE" || echo "0")
  TIMEOUT_COUNT=$(grep -c "TIMEOUT" "$TEMP_FILE" || echo "0")
  FAIL_COUNT=$(grep -c "HTTP [^2]" "$TEMP_FILE" || echo "0")
fi

rm -f "$TEMP_FILE"

# Calculate statistics
SUCCESS_RATE=$((SUCCESS_COUNT * 100 / TOTAL_REQUESTS))
REQUESTS_PER_SECOND=$((TOTAL_REQUESTS / TOTAL_TIME))

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Resultados do Teste de Carga${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Total de Requisições: ${YELLOW}$TOTAL_REQUESTS${NC}"
echo -e "Tempo Decorrido: ${YELLOW}${TOTAL_TIME}s${NC}"
echo ""
echo -e "Sucessos (HTTP 200): ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "Falhas: ${RED}$FAIL_COUNT${NC}"
echo -e "Timeouts: ${YELLOW}$TIMEOUT_COUNT${NC}"
echo ""
echo -e "Taxa de Sucesso: ${GREEN}${SUCCESS_RATE}%${NC}"
echo -e "Requisições/Segundo: ${YELLOW}${REQUESTS_PER_SECOND}${NC}"
echo ""

# Check resource usage
echo -e "${BLUE}Monitoramento de Recursos${NC}"
echo ""

# Docker stats (if running in Docker)
if command -v docker &> /dev/null; then
  echo -e "Docker Stats para ${YELLOW}archiving-api-staging${NC}:"
  docker stats --no-stream archiving-api-staging 2>/dev/null || echo "Container não encontrado"
else
  echo "Docker não disponível para monitoramento"
fi

echo ""

# Performance assessment
echo -e "${BLUE}Avaliação de Performance${NC}"
echo ""

if [ $SUCCESS_RATE -ge 95 ]; then
  echo -e "${GREEN}✓ Taxa de sucesso aceitável (>= 95%)${NC}"
else
  echo -e "${RED}✗ Taxa de sucesso abaixo do esperado (< 95%)${NC}"
fi

if [ $TIMEOUT_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ Nenhum timeout detectado${NC}"
else
  echo -e "${YELLOW}⚠ $TIMEOUT_COUNT timeouts detectados${NC}"
fi

if [ $REQUESTS_PER_SECOND -ge 10 ]; then
  echo -e "${GREEN}✓ Throughput satisfatório (>= 10 req/s)${NC}"
else
  echo -e "${YELLOW}⚠ Throughput baixo (< 10 req/s)${NC}"
fi

echo ""

# Recommendations
if [ $SUCCESS_RATE -lt 95 ]; then
  echo -e "${YELLOW}Recomendações:${NC}"
  echo "1. Revisar logs para identificar padrão de falhas"
  echo "2. Verificar limites de recursos (CPU, memória, conexões)"
  echo "3. Aumentar timeout se necessário"
  echo "4. Considerar otimizações de código"
  echo ""
fi

# Verify system health after load
echo -e "${YELLOW}Verificando saúde do sistema após teste...${NC}"
HEALTH=$(curl -s "$STAGING_SERVER/health" 2>&1 || echo "fail")

if echo "$HEALTH" | grep -q "ok"; then
  echo -e "${GREEN}✓ Sistema ainda respondendo corretamente${NC}"
else
  echo -e "${RED}✗ Sistema pode estar degradado${NC}"
fi

echo ""
echo -e "${BLUE}Teste de Carga Concluído${NC}"
echo ""
