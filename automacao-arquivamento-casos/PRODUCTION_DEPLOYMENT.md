# Etapa 8: Deploy em Produção

## ⚠️ Crítico: Verificação Final Antes de Produção

### Requisitos Obrigatórios
- [x] Etapa 6 completa: Todos os 51 testes passando
- [x] Etapa 5.1 completa: Integração de serviços validada
- [ ] Etapa 7 completa: Staging testado e aprovado
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Backups dos dados existentes realizados
- [ ] Plano de rollback documentado

### Checklist de Segurança
- [ ] Tokens de API seguros (não em código-fonte)
- [ ] Logs não contêm dados sensíveis (PII)
- [ ] Rate limiting configurado
- [ ] CORS restrito a domínios conhecidos
- [ ] Autenticação de webhook validada

## Instruções de Deployment

### 1. Preparação Final
```bash
# Backup dos dados existentes
cp .archiving-history.json .archiving-history.backup.json

# Build final
npm run build

# Testes finais
npm test

# Lint/Verificação de código
npm run lint  # Se disponível
```

### 2. Configuração de Produção

Criar arquivo `.env.production`:
```
ENVIRONMENT=production
NODE_ENV=production

# APIs
ADVBOX_API_TOKEN=<production_token>
ASAAS_API_TOKEN=<production_token>

# CRM Financial
CRM_FINANCIAL_WEBHOOK_SECRET=<secret>
CRM_FINANCIAL_API_TOKEN=<token>

# Notificações
SLACK_WEBHOOK_URL=<production_slack>
SLACK_CHANNEL_SUCCESS=#archiving-success
SLACK_CHANNEL_ERROR=#archiving-errors
SLACK_CHANNEL_CRITICAL=#archiving-critical

# Retry Configuration
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_DELAY_MS=1000
RETRY_MAX_DELAY_MS=30000
RETRY_BACKOFF_MULTIPLIER=2

# CRM Polling (fallback)
CRM_POLLING_INTERVAL_MINUTES=15

# Server
PORT=3000
HOST=0.0.0.0
```

### 3. Deploy

**Via GitHub Actions** (recomendado):
```bash
# Fazer push para branch production
git checkout -b release/v1.0.0
git push origin release/v1.0.0

# GitHub Actions executará:
# 1. Build
# 2. Testes
# 3. Deploy para produção
# 4. Smoke tests
```

**Manual** (se necessário):
```bash
# SSH para servidor de produção
ssh prod-server

# Clone e setup
git clone <repo>
cd automacao-arquivamento-casos
npm install
npm run build

# Iniciar serviço
pm2 start src/server.ts --name archiving-automation

# Verificar status
pm2 logs archiving-automation
```

### 4. Validação Pós-Deploy

Imediatamente após deploy:

```bash
# Health check
curl http://prod-server:3000/archiving/health

# Verificar que webhook está escutando
curl -X POST http://prod-server:3000/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-token>" \
  -d '{"test": true}'

# Monitorar logs em tempo real
pm2 logs archiving-automation
```

### 5. Monitoramento Contínuo

**Métricas a acompanhar:**
- Taxa de sucesso (objetivo: > 95%)
- Latência média (objetivo: < 10s)
- Erros críticos (objetivo: 0)
- CPU/Memória (objetivo: < 80%)

**Alertas automáticos:**
- Taxa de erro > 5% → alerta crítico
- Latência > 30s → alerta
- Serviço indisponível → página de status
- Múltiplas falhas consecutivas → escalação

### 6. Plano de Rollback

Se problemas críticos forem detectados:

```bash
# 1. Reverter para versão anterior
git revert <commit>
npm run build

# 2. Reiniciar serviço
pm2 restart archiving-automation

# 3. Verificar logs
pm2 logs archiving-automation

# 4. Notificar stakeholders
# Slack notification via SLACK_WEBHOOK_URL
```

### 7. Procedimento Pós-Deploy (24 horas)

- [ ] Monitorar logs por erros não tratados
- [ ] Validar que todos os casos foram processados
- [ ] Confirmar que nenhum caso foi duplicado
- [ ] Revisar estatísticas de sucesso
- [ ] Documentar qualquer issue encontrado

## Escalação de Problemas

Se algo der errado:

1. **Erro imediato (< 5 min)**
   - Executar rollback automático
   - Notificar squad via Slack
   - Documentar erro

2. **Erro em horas seguintes**
   - Investigar logs
   - Identificar causa raiz
   - Aplicar hotfix ou rollback
   - Comunicar com cliente

3. **Problema em produção**
   - Page duty escalation
   - War room em Slack
   - Prioridade máxima

## Métricas de Sucesso

Após 24 horas em produção:

- [ ] 99% de uptime
- [ ] Taxa de sucesso > 95%
- [ ] Latência mediana < 5 segundos
- [ ] Zero casos perdidos
- [ ] Zero duplicatas
- [ ] Todos os alertas funcionando

## Documentação Final

Atualizar:
- [ ] Runbook de operações
- [ ] Documentação de APIs
- [ ] Processo de troubleshooting
- [ ] Contatos de emergência

---

**Status**: ⏳ Ready for Production Deployment
**Data**: 2026-10-08
**Versão**: 1.0.0
