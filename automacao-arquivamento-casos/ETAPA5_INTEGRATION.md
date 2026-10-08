# ETAPA 5.1: Integração no Webhook Server

## 🎯 Objetivo
Integrar completamente os serviços de Etapa 5 (Retry, Alerting, History) no Webhook Server, criando um pipeline robusto de processamento de arquivamento com retry automático, alertas em múltiplos canais e rastreamento completo de tentativas.

## ✅ O que foi integrado

### 1. **WebhookHandler (src/integrations/webhook-handler.ts)**

**Antes (Etapa 4):**
```typescript
const automationService = new ArchivingAutomationService();
const result = await automationService.processArchivingCase(payload);
```

**Depois (Etapa 5.1):**
```typescript
const automationWithAlerts = getGlobalArchivingWithAlerts({
  enableRetry: true,
  retryConfig: { maxRetries: 3, initialDelayMs: 1000, ... },
  enableSlack: true,
  enableHistory: true,
  enableAlerting: true,
});
const result = await automationWithAlerts.processArchivingCaseWithRetry(payload);
```

**Modificações:**
- ✅ Importa `ArchivingAutomationWithAlerts` e `getGlobalArchivingWithAlerts`
- ✅ Instancia o wrapper com configuração completa (retry, slack, history, alerting)
- ✅ Configura retry via variáveis de ambiente:
  - `RETRY_MAX_ATTEMPTS` (default: 3)
  - `RETRY_INITIAL_DELAY_MS` (default: 1000)
  - `RETRY_MAX_DELAY_MS` (default: 30000)
  - `RETRY_BACKOFF_MULTIPLIER` (default: 2)
- ✅ Habilita Slack automaticamente se `SLACK_WEBHOOK_URL` estiver configurado
- ✅ Adiciona métodos getter para acesso ao histórico e estatísticas:
  - `getHistory()` → retorna histórico completo
  - `getStatistics()` → retorna estatísticas agregadas
  - `getCriticalAlertCount()` → retorna contagem de alertas críticos

### 2. **WebhookServer (src/server.ts)**

**Novos Endpoints:**

```typescript
// Histórico de processamentos
GET /archiving/history
Response: { timestamp, history: {...} }

// Estatísticas em tempo real
GET /archiving/stats
Response: { timestamp, statistics: {...}, criticalAlerts: N }
```

**Atualizado:**
- ✅ Logging de endpoints no startup
- ✅ Endpoints para monitoramento de histórico e estatísticas
- ✅ Health check agora retorna stats e critical alerts

## 🔄 Fluxo Completo de Processamento

```
┌─────────────────────────────────────────────────────────────┐
│ CRM Financial envia webhook POST /webhook                  │
│ Header: Authorization: Bearer <token>                       │
│ Body: { lawsuit_id, process_number, client_name, ... }     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ WebhookHandler       │
        │ - Valida auth        │
        │ - Valida payload     │
        └──────────┬───────────┘
                   │
                   ▼
    ┌────────────────────────────────────────┐
    │ ArchivingAutomationWithAlerts         │
    │ - Inicia retry automático              │
    │ - Configura notificações              │
    └──────────────────┬─────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
         ▼                            ▼
    ┌──────────────┐          ┌─────────────┐
    │ RetryManager │          │ AlertingService
    │ - Backoff    │          │ - Slack      
    │ - Retry      │          │ - Email (future)
    │ - Logging    │          │ - Logging    
    └──────┬───────┘          └────────┬─────┘
           │                           │
           ├───────────────┬───────────┘
           │               │
           ▼               ▼
    ┌──────────────────────────────────┐
    │ ArchivingAutomationService       │
    │ - Busca transferência Asaas      │
    │ - Cria tarefa em Advbox          │
    │ - Retorna ArchivingTask          │
    └──────────────┬───────────────────┘
                   │
         ┌─────────┴──────────────┐
         │                        │
         ▼                        ▼
    ┌──────────────┐      ┌──────────────┐
    │ HistoryService      │ SlackNotifier
    │ - Persiste  │      │ - Envia block
    │ - Retém 100 │      │ - Formato     
    │ - Indexa    │      │ - Webhooks    
    └─────────────┘      └──────────────┘
         │
         ▼
    .archiving-history.json
    (persistent state)
```

## 🛡️ Configuração de Retry

**Fluxo de retry com exponential backoff:**

```
Tentativa 1 (imediato)
  ├─ Falha
  │
Tentativa 2 (após 1s)
  ├─ Falha
  │
Tentativa 3 (após 2s)
  ├─ Falha
  │
Tentativa 4 (após 4s)
  └─ Falha → Registra erro, notifica crítico, persiste no histórico
```

**Configurações via .env:**
```bash
# Retry behavior
RETRY_MAX_ATTEMPTS=3                    # Máximo de tentativas
RETRY_INITIAL_DELAY_MS=1000             # Delay inicial (1 segundo)
RETRY_MAX_DELAY_MS=30000                # Delay máximo (30 segundos)
RETRY_BACKOFF_MULTIPLIER=2              # Exponential backoff factor
```

## 📊 Monitoramento e Alertas

### Endpoints de Monitoramento

**1. Health Check Completo:**
```bash
GET /health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2026-10-08T16:30:00Z",
  "polling": {
    "isRunning": true,
    "lastProcessedTimestamp": "2026-10-08T16:15:00Z",
    "errorCount": 0
  }
}
```

**2. Webhook Health + Stats:**
```bash
GET /webhook/health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2026-10-08T16:30:00Z",
  "stats": {
    "totalAttempts": 42,
    "successCount": 40,
    "errorCount": 2,
    "successRate": 95.24,
    "lastUpdated": "2026-10-08T16:29:30Z"
  },
  "criticalAlerts": 0
}
```

**3. Histórico Completo:**
```bash
GET /archiving/history
```
Response:
```json
{
  "timestamp": "2026-10-08T16:30:00Z",
  "history": {
    "lastUpdated": "2026-10-08T16:29:30Z",
    "totalAttempts": 42,
    "successCount": 40,
    "errorCount": 2,
    "entries": [
      {
        "id": "1728-abc123def456",
        "timestamp": "2026-10-08T16:29:30Z",
        "processNumber": "0000123-XX.XXXX.X.XX.XXXX",
        "clientName": "João da Silva",
        "lawsuitId": "lawsuit-123",
        "status": "success",
        "attempt": 1,
        "maxAttempts": 3,
        "result": {
          "taskId": "advbox-task-456",
          "protocol": "2026ADVM000456",
          "honoraries": "R$ 1.200,50",
          "caseType": "CONTRATUAL"
        },
        "durationMs": 2340
      }
      // ... mais entries
    ]
  }
}
```

**4. Estatísticas:**
```bash
GET /archiving/stats
```
Response:
```json
{
  "timestamp": "2026-10-08T16:30:00Z",
  "statistics": {
    "totalAttempts": 42,
    "successCount": 40,
    "errorCount": 2,
    "successRate": 95.24,
    "lastUpdated": "2026-10-08T16:29:30Z"
  },
  "criticalAlerts": 0
}
```

## 🚨 Alertas Slack

### Tipos de Notificações

**1. Success (✅ Verde)**
```
┌─ ✅ Arquivamento Completado ─┐
│ Caso: João da Silva         │
│ Processo: 0000123-XX...     │
│ ID da Tarefa: adv-456       │
│ Timestamp: 2026-10-08...    │
└─────────────────────────────┘
```

**2. Error (🚨 Vermelho)**
```
┌─ 🚨 Erro no Arquivamento ─┐
│ Caso: João da Silva       │
│ Processo: 0000123-XX...   │
│ Lawsuit ID: lawsuit-123   │
│ Erro: Connection timeout  │
└───────────────────────────┘
```

**3. Retry (🔄 Amarelo)**
```
┌─ 🔄 Retry em Progresso ─┐
│ Caso: João da Silva    │
│ Tentativa: 2/3         │
│ Tentando novamente...  │
└────────────────────────┘
```

**4. Critical (🔴 Vermelho Escuro)**
Enviado quando 3+ alertas críticos seguidos → Indica falha sistêmica

### Configuração Slack

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../X...
SLACK_CHANNEL=#automacao              # Canal para sucesso/avisos
SLACK_CHANNEL_ALERTS=#alertas         # Canal para erros/críticos
```

## 📝 Persistência de Histórico

**Arquivo: `.archiving-history.json`**

```json
{
  "lastUpdated": "2026-10-08T16:29:30Z",
  "totalAttempts": 42,
  "successCount": 40,
  "errorCount": 2,
  "entries": [
    {
      "id": "1728-abc123def456",
      "timestamp": "2026-10-08T16:29:30Z",
      "processNumber": "0000123-XX.XXXX.X.XX.XXXX",
      "clientName": "João da Silva",
      "lawsuitId": "lawsuit-123",
      "status": "success",
      "attempt": 1,
      "maxAttempts": 3,
      "result": { ... },
      "durationMs": 2340
    }
  ]
}
```

**Características:**
- ✅ Persiste automaticamente após cada tentativa
- ✅ Retém últimas 100 entradas
- ✅ Busca por process number ou client name
- ✅ Estatísticas agregadas em tempo real
- ✅ Timestamps para auditoria

## 🔐 Idempotência e Deduplicação

**Como evitar processamento duplicado:**

1. **Webhook ID:** CRM Financial deve enviar ID único para cada caso
2. **Process Number:** Usado como chave primária no histórico
3. **Timestamp de Detecção:** Impede reprocessamento de caso antigo
4. **Lock no Processamento:** RetryManager aguarda conclusão da tentativa

**Garantia:**
- Mesmo webhook disparado 2x → Processado apenas 1x
- Mesmo caso processado 2x → Histórico registra ambas tentativas
- Fallback polling não reprocessa casos recentes

## 📈 Métricas Coletadas

Por cada processamento:
- ✅ `timestamp` - Quando foi processado
- ✅ `processNumber` - ID do caso
- ✅ `clientName` - Nome do cliente
- ✅ `status` - success | error | retry
- ✅ `attempt` - Qual tentativa (1-3)
- ✅ `maxAttempts` - Configurado
- ✅ `durationMs` - Tempo total
- ✅ `result` - taskId, protocol, honoraries, caseType
- ✅ `errorMessage` - Se falhou

## 🧪 Testando a Integração

### 1. Health Check
```bash
curl http://localhost:3000/health
curl http://localhost:3000/webhook/health
```

### 2. Enviar Webhook (com retry)
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Authorization: Bearer SECRET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lawsuit_id": "lawsuit-123",
    "process_number": "0000123-XX.XXXX.X.XX.XXXX",
    "client_name": "João da Silva",
    "case_type": "CONTRATUAL"
  }'
```

### 3. Verificar Histórico
```bash
curl http://localhost:3000/archiving/history | jq .
curl http://localhost:3000/archiving/stats | jq .
```

### 4. Simular Falha (para testar retry)
- Desabilitar API do Asaas
- Webhook dispara com retry automático
- Você vê: attempt 1/3 → 2/3 → 3/3 no histórico
- Slack notifica a cada tentativa

## 🚀 Próximos Passos

### Etapa 6: Testes Automatizados
- ✅ Unit tests para RetryManager (exponential backoff)
- ✅ Unit tests para HistoryService (persistence, searches)
- ✅ Unit tests para AlertingService (per-channel notifications)
- ✅ Integration tests com mocks
- ✅ Load testing (múltiplos webhooks simultâneos)

### Etapa 7: Deploy Staging
- ✅ Testar com dados reais do Advbox
- ✅ Validar Slack notifications
- ✅ Simular falhas e testar retry
- ✅ Verificar .archiving-history.json
- ✅ End-to-end flow testing

### Etapa 8: Deploy Produção
- ✅ Ativar webhook no CRM Financial
- ✅ Configurar Slack alerts
- ✅ Monitoramento 24/7
- ✅ Manter logs para auditoria
- ✅ Testar fallback polling

## 📋 Checklist de Integração

- [x] Importar ArchivingAutomationWithAlerts no WebhookHandler
- [x] Configurar retry com variáveis de ambiente
- [x] Instanciar com enableRetry, enableSlack, enableHistory, enableAlerting
- [x] Modificar handleWebhook para usar processArchivingCaseWithRetry
- [x] Adicionar getter methods para history/stats/criticalAlerts
- [x] Adicionar endpoints GET /archiving/history e /archiving/stats
- [x] Compilação sem erros TypeScript
- [x] Commit e push para GitHub
- [x] Documentação completa

## ✨ Benefícios da Integração

1. **Resiliência:** Retry automático com backoff exponencial
2. **Rastreabilidade:** Histórico completo de cada tentativa
3. **Alertas:** Notificações em tempo real via Slack
4. **Monitoramento:** Endpoints para visualizar status e estatísticas
5. **Observabilidade:** Logs estruturados e métricas agregadas
6. **Idempotência:** Detecção de processamento duplicado
7. **Escalabilidade:** Singleton pattern permite múltiplas instâncias

---

**Status:** ✅ INTEGRAÇÃO COMPLETA - Pronto para Etapa 6 (Testes)
