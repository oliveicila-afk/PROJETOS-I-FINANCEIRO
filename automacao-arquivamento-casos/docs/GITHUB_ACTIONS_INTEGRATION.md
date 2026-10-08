# GitHub Actions Integration - Fase 4 (Etapa 4)

**Status**: ✅ Implementado  
**Data**: 08/10/2026

---

## Visão Geral

GitHub Actions é usado como mecanismo alternativo/complementar para disparar a automação de arquivamento. O workflow pode ser acionado por:

1. **repository_dispatch** - Chamadas programáticas via GitHub API
2. **Manual** - Disparo manual via GitHub UI

---

## Workflow Structure

### Arquivo
```
.github/workflows/webhook-trigger.yml
```

### Jobs

**1. trigger-archiving-automation**
- Responsável por executar a automação principal
- Timeout: 10 minutos
- Runs: ubuntu-latest

**2. report-status** (depends-on)
- Relata resultado ao CRM Financial
- Executa apenas após conclusão do job anterior

---

## Triggering the Workflow

### Via GitHub API (repository_dispatch)

```bash
curl -X POST \
  https://api.github.com/repos/{owner}/{repo}/dispatches \
  -H "Authorization: token {github_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "archive-case",
    "client_payload": {
      "lawsuit_id": "12345",
      "process_number": "0052754-30.2026.8.04.1000",
      "client_name": "Joao da Silva",
      "case_type": "SUCUMBENCIAL"
    }
  }'
```

### Via CLI (gh)

```bash
gh workflow run webhook-trigger.yml \
  -f lawsuit_id="12345" \
  -f process_number="0052754-30.2026.8.04.1000" \
  -f client_name="Joao da Silva" \
  -f case_type="SUCUMBENCIAL"
```

---

## Required Secrets

Adicione os seguintes secrets ao repositório GitHub:

```
ADVBOX_TOKEN              # Token de autenticação Advbox
ADVBOX_API_URL           # URL da API Advbox (opcional, tem default)
ASAAS_API_TOKEN          # Token de autenticação Asaas
ASAAS_API_URL            # URL da API Asaas (opcional, tem default)
CRM_FINANCIAL_API_URL    # URL da API do CRM Financial
CRM_FINANCIAL_TOKEN      # Token de autenticação CRM
WEBHOOK_SECRET           # Secret para validação de webhook
MAIL_SERVER              # Servidor SMTP para notificações
MAIL_PORT                # Porta SMTP
MAIL_USERNAME            # Username SMTP
MAIL_PASSWORD            # Password SMTP
ADMIN_EMAIL              # Email do administrador para notificações
```

### Como Adicionar Secrets

1. Ir para: Settings → Secrets and variables → Actions
2. Click em "New repository secret"
3. Adicionar cada secret

---

## Workflow Steps

### 1. Checkout e Setup
```yaml
- Checkout codigo
- Setup Node.js 18.x
- Instalar dependencias
```

### 2. Validação
```yaml
- Validar payload (lawsuit_id, process_number, client_name)
- Validar estrutura dos dados
```

### 3. Execução
```bash
npm run archive-case -- \
  --lawsuit-id {id} \
  --process-number {numero} \
  --client-name {nome} \
  --case-type {tipo}
```

### 4. Notificação
- **Success**: Email notificando sucesso do arquivamento
- **Failure**: Email notificando erro e logs

### 5. Reporting
- Reporta status ao CRM Financial via API
- Inclui GitHub run ID para rastreamento

---

## Payload Structure

### Input

```json
{
  "lawsuit_id": "12345",
  "process_number": "0052754-30.2026.8.04.1000",
  "client_name": "Joao da Silva",
  "case_type": "SUCUMBENCIAL"
}
```

**Campos Obrigatórios:**
- `lawsuit_id` - ID único do caso
- `process_number` - Número do processo judicial
- `client_name` - Nome do cliente

**Campos Opcionais:**
- `case_type` - Tipo de caso (SUCUMBENCIAL|CONTRATUAL|OTHER)
  - Se não informado, o sistema detecta automaticamente

### Output

#### Success (HTTP 200)

```json
{
  "status": "success",
  "timestamp": "2026-10-08T15:30:45.123Z",
  "result": {
    "caseId": "0052754-30.2026.8.04.1000",
    "taskCreated": true,
    "taskId": "task_123",
    "protocol": "ARQ-2026-10-08-001",
    "honoraries": "R$ 5.587,36"
  }
}
```

#### Error (HTTP 500)

```json
{
  "status": "error",
  "timestamp": "2026-10-08T15:30:45.123Z",
  "error": "Transferencia nao encontrada no Asaas"
}
```

---

## Integration with Webhook Server

O GitHub Actions workflow é uma alternativa ao webhook direto do Express server. Ambos podem coexistir:

### Opção 1: Webhook Express → GitHub Actions
```
CRM Financial → POST /webhook (Express)
                       ↓
                Valida e dispara GitHub Actions
                       ↓
                GitHub Actions executa automação
```

### Opção 2: Webhook Express → Executa Direto
```
CRM Financial → POST /webhook (Express)
                       ↓
                Executa automação diretamente
```

### Opção 3: CRM → GitHub Actions Direto
```
CRM Financial → GitHub API (repository_dispatch)
                       ↓
                GitHub Actions executa automação
```

---

## Monitoring Workflow

### Via GitHub UI
1. Settings → Actions → Workflows
2. Selecionar "webhook-trigger"
3. Visualizar execuções recentes

### Via GitHub CLI
```bash
# Listar execuções
gh run list -w webhook-trigger.yml

# Ver detalhes de uma execução
gh run view {run-id}

# Ver logs de um job
gh run view {run-id} --log
```

### Via API
```bash
# Listar execuções
curl https://api.github.com/repos/{owner}/{repo}/actions/runs

# Ver detalhes
curl https://api.github.com/repos/{owner}/{repo}/actions/runs/{run-id}
```

---

## Troubleshooting

### Workflow nao aparece em Actions

1. Verificar se arquivo esta em `.github/workflows/`
2. Verificar sintaxe YAML (usar yamllint)
3. Fazer commit e push do arquivo

### Erro: "Secret not found"

1. Verificar nome exato do secret (case-sensitive)
2. Settings → Secrets and variables → Actions
3. Verificar se secret esta criado

### Timeout na execucao

1. Aumentar timeout em workflow (max 360 minutos)
2. Verificar se API Advbox/Asaas esta respondendo
3. Adicionar logs intermediarios

### Email nao enviado

1. Verificar credenciais SMTP
2. Teste manual:
   ```bash
   echo "test" | mail -S smtp={server}:{port} \
     -S smtp_use_starttls \
     -S smtp_auth=login \
     -S smtp_auth_user={user} \
     -S smtp_auth_password={pass} \
     admin@email.com
   ```

---

## Próximos Passos

- [x] Etapa 4: GitHub Actions Workflow (COMPLETO)
- [ ] Etapa 5: Error Handling e Alertas
  - Slack integration
  - Dashboard com histórico
  - Retry automático
- [ ] Etapa 6: Testes Automatizados
  - Unit tests
  - Integration tests
  - Load testing
- [ ] Etapa 7: Deploy em Staging
- [ ] Etapa 8: Deploy em Produção

---

## Referências

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [repository_dispatch Event](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#repository_dispatch)
- [GitHub REST API - Create Dispatch Event](https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#create-a-repository-dispatch-event)
