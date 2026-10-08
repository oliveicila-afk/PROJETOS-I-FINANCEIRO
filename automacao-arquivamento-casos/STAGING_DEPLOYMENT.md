# Etapa 7: Deploy em Staging

## Objetivo
Validar o sistema em ambiente de staging com dados reais antes de produção.

## Checklist de Staging

### 1. Preparação do Ambiente Staging
- [ ] Criar arquivo `.env.staging` com credenciais de teste
- [ ] Verificar acesso às APIs: Advbox, Asaas, CRM Financial
- [ ] Validar tokens e webhooks de staging
- [ ] Confirmar endpoint de webhook staging

### 2. Deploy Staging
```bash
# Build
npm run build

# Deploy (via GitHub Actions ou manual)
# Configurar variáveis de ambiente de staging:
ENVIRONMENT=staging
ADVBOX_API_TOKEN=<staging_token>
ASAAS_API_TOKEN=<staging_token>
CRM_FINANCIAL_WEBHOOK_URL=<staging_webhook>
SLACK_WEBHOOK_URL=<staging_slack>
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_DELAY_MS=1000
```

### 3. Testes em Staging
- [ ] **Webhook test**: Disparar webhook simulado do CRM Financial
  ```bash
  curl -X POST http://staging-server/webhook \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <crm-token>" \
    -d '{
      "caseId": "CASE-001",
      "processNumber": "0000001-XX.XXXX.X.XX.XXXX",
      "clientName": "Test Client",
      "changeColumn": "PARA_ARQUIVAR"
    }'
  ```

- [ ] **Verificar logs**:
  ```bash
  # Ver histórico
  curl http://staging-server/archiving/history
  
  # Ver estatísticas
  curl http://staging-server/archiving/stats
  ```

- [ ] **Verificar Slack notifications**:
  - [ ] Success notification recebida
  - [ ] Error notification (se houver falha)
  - [ ] Retry notification
  - [ ] Critical alert (se múltiplas falhas)

- [ ] **Simular falhas**:
  - [ ] Desabilitar webhook, validar polling fallback (15 min)
  - [ ] Timeout na API Advbox, validar retry com backoff
  - [ ] Erro de autenticação, validar alerta crítico

### 4. Validação de Dados
- [ ] Tarefa criada em Advbox com protocolo correto
- [ ] Histórico persistido em `.archiving-history.json`
- [ ] Nenhum caso duplicado (idempotência)
- [ ] Status correto no CRM Financial atualizado

### 5. Monitoramento
- [ ] Dashboard de logs ativo
- [ ] Alertas Slack configurados
- [ ] CPU/Memória dentro de limites normais
- [ ] Sem erros não capturados

### 6. Teste de Carga (Opcional)
```bash
# Simular múltiplos webhooks simultâneos
for i in {1..10}; do
  curl -X POST http://staging-server/webhook ... &
done
wait
```

## Critérios de Aprovação para Produção

Todas as caixas abaixo devem estar marcadas:

- [ ] Todos os testes passando (51/51)
- [ ] Webhook recebe e processa eventos
- [ ] Automação dispara em < 10 segundos
- [ ] Tarefa criada com protocolo correto
- [ ] Logs registram cada execução
- [ ] Fallback de polling funciona
- [ ] Alertas disparam em caso de erro
- [ ] Nenhum caso perdido (idempotência)
- [ ] Monitoramento está operacional

## Próximo Passo
Após validação completa, prosseguir para **Etapa 8: Deploy Produção**

---

**Status**: ⏳ Awaiting Staging Deployment
**Data**: 2026-10-08
