# Etapa 8: Production Readiness Checklist

**Data**: 2026-10-08  
**Status**: ⏳ Em Preparação (execução agendada 2026-10-10)  
**Responsável**: DevOps Lead + Tech Lead  

---

## 📋 Checklist Pré-Deploy (Deve estar 100% antes de 2026-10-10)

### Infraestrutura & Credenciais

- [ ] **Ambiente de Produção Reservado**
  - [ ] Servidor/VPC alocado
  - [ ] Endereço IP fixo confirmado
  - [ ] DNS configurado (prod-api.calandrini.internal)
  - [ ] Certificado SSL/TLS solicitado (Let's Encrypt ou CA corporativa)

- [ ] **Credenciais de Produção Preparadas** (em Vault/Secrets Manager)
  - [ ] `ADVBOX_API_TOKEN` (produção real)
  - [ ] `ASAAS_API_TOKEN` (produção real)
  - [ ] `CRM_FINANCIAL_API_TOKEN` (webhook auth de produção)
  - [ ] `SLACK_WEBHOOK_URL_PROD` (canal #archiving-production)
  - [ ] Validar: nenhuma credencial exposta em logs/git
  - [ ] Backup: screenshot/nota segura guardada fora do repositório

- [ ] **Banco de Dados de Produção**
  - [ ] PostgreSQL instância criada (ou RDS se cloud)
  - [ ] Schema migrado de staging
  - [ ] Backup automático configurado (daily, 30-day retention)
  - [ ] Teste de restore em ambiente de staging validado
  - [ ] Credenciais armazenadas em Vault

- [ ] **Redis de Produção**
  - [ ] Instância criada (memory limit: 256MB)
  - [ ] AOF persistence ativado
  - [ ] Acesso restrito a IP do API server
  - [ ] Backup verificado

### Testes & Validação

- [ ] **51/51 Testes Passando em Staging**
  - [ ] `npm test` executado hoje
  - [ ] 51/51 passando (nem mais, nem menos)
  - [ ] Coverage > 95%
  - [ ] Zero warnings de compilação

- [ ] **Staging Validation Concluída (2026-10-09)**
  - [ ] Todas 13 fases de STAGING_VALIDATION_CHECKLIST.md marcadas ✅
  - [ ] QA Lead sign-off recebido
  - [ ] DevOps Lead sign-off recebido
  - [ ] Tech Lead sign-off recebido
  - [ ] PM sign-off recebido

- [ ] **Teste de Dados Sensíveis**
  - [ ] Grep logs por padrões sensíveis (CPF, números de conta):
    ```bash
    grep -r -E '\d{3}\.\d{3}\.\d{3}-\d{2}' src/
    grep -r -E 'cc|conta' src/
    ```
  - [ ] Mascaramento de CPF em logs ativado (MASK_CPF=true)
  - [ ] LOG_SENSITIVE_DATA=false em .env.production

### Segurança & Conformidade

- [ ] **Certificado SSL/TLS**
  - [ ] Certificado válido e instalado
  - [ ] Auto-renewal configurado (certbot com systemd timer)
  - [ ] Teste de HTTPS: `curl -I https://prod-api.calandrini.internal/health`

- [ ] **Secrets Management**
  - [ ] Vault/K8s Secrets Manager ativo
  - [ ] Acesso restrito (só DevOps Lead + Tech Lead podem ler)
  - [ ] Audit log de acesso a secrets ativado
  - [ ] Plano de rotação de secrets (quarterly) agendado

- [ ] **Network Security**
  - [ ] Firewall: inbound apenas 443 (HTTPS) + 22 (SSH for ops)
  - [ ] Outbound: Advbox, Asaas, Slack, CRM, Let's Encrypt permitidos
  - [ ] Rate limiting: 100 req/s por IP
  - [ ] WAF (Web Application Firewall): ativado se disponível

- [ ] **Backup & Disaster Recovery**
  - [ ] PostgreSQL backup: daily, stored in S3 or external location
  - [ ] Redis backup (AOF file): backed up daily
  - [ ] Test restore procedure: testado e documentado
  - [ ] RTO (Recovery Time Objective): < 15 minutos
  - [ ] RPO (Recovery Point Objective): < 1 hora

### Monitoramento & Alertas

- [ ] **Elasticsearch & Kibana**
  - [ ] Elasticsearch cluster saudável (1-node ok para prod inicial)
  - [ ] Index lifecycle management: daily indices, 30-day retention
  - [ ] Kibana accessible (via VPN para ops)
  - [ ] Dashboards criados:
    - [ ] Health & Status
    - [ ] Performance Metrics
    - [ ] Error Rate & Logs
    - [ ] Webhook Activity

- [ ] **Alerting Rules**
  - [ ] Success rate < 80% → critical alert Slack
  - [ ] Success rate < 95% → warning alert Slack
  - [ ] Service down (health check fails) → critical alert
  - [ ] Memory > 80% → warning alert
  - [ ] CPU > 80% → warning alert
  - [ ] Database connection pool exhausted → critical alert

- [ ] **Slack Channels Criados**
  - [ ] #archiving-production (logs gerais)
  - [ ] #archiving-success (casos processados)
  - [ ] #archiving-errors (erros e retries)
  - [ ] #archiving-critical (service down, rollback)

### Documentation & Runbooks

- [ ] **Documentação Atualizada**
  - [ ] PRODUCTION_DEPLOYMENT.md revisado
  - [ ] Runbook de deploy criado
  - [ ] Runbook de rollback criado
  - [ ] Runbook de incident response criado
  - [ ] Credenciais guardadas de forma segura (não no git!)

- [ ] **Contatos & Escalação**
  - [ ] Tech Lead: responsável por go-live
  - [ ] DevOps Lead: responsável por monitoramento 24h
  - [ ] QA Lead: responsável por validação
  - [ ] Anderson (jurídico): notificado sobre timing
  - [ ] Números de contato de emergência documentados

### Final Pre-Deployment (24h antes do deploy)

- [ ] **Health Check de Componentes**
  - [ ] API container: imagem build testada em staging
  - [ ] Redis: conecta e responde ao PING
  - [ ] PostgreSQL: conecta e tabelas existem
  - [ ] Elasticsearch: cluster green
  - [ ] Kibana: acessível

- [ ] **Verificação de Endpoints**
  - [ ] Advbox API: acessível com credenciais de produção
  - [ ] Asaas API: acessível com credenciais de produção
  - [ ] CRM Financial: pronto para enviar webhooks
  - [ ] Slack webhooks: testados com mensagem de teste

- [ ] **Teste de Rollback**
  - [ ] Binário anterior (Etapa 7 staging) guardado
  - [ ] Procedimento de rollback revisado
  - [ ] Git tag criado antes do deploy
  - [ ] Backup do estado atual feito

---

## 🚀 Timeline de Execução (2026-10-10)

### T-24h (2026-10-09 Evening)
- [ ] Todos os checklist items acima marcados ✅
- [ ] Tech Lead e DevOps Lead confirmam readiness

### T-0 (2026-10-10 Morning)
- [ ] Comunicação ao time: "Deploy em 2 horas"
- [ ] Backup final de staging database
- [ ] Última validação de credenciais

### T+0 (Deploy time)
- Seguir `PRODUCTION_DEPLOYMENT.md` sequencialmente

### T+1h-24h (Monitoramento)
- [ ] Monitoramento contínuo 24h
- [ ] Logs analisados a cada 1h
- [ ] Alerts testados (1 webhook manual para cada tipo)
- [ ] Relatório horário para stakeholders

---

## ✅ Sign-Off Required (Todos 4 devem assinar ANTES do deploy)

```
PRODUCTION READINESS APPROVAL

Data: _______________

QA Lead: ______________________ Assinatura: ____________

DevOps Lead: __________________ Assinatura: ____________

Technical Lead: ______________ Assinatura: ____________

Project Manager: _____________ Assinatura: ____________

Aprovado para Produção: ☐ SIM ☐ NÃO

Observações/Riscos: ___________________________________
```

---

**Documento Preparado Por:** DevOps Team  
**Última Atualização:** 2026-10-08  
**Status:** ⏳ Aguardando Staging Validation (2026-10-09)
