# CLI Reference - Case Archiving Automation

**Command**: `npm run archive-case`

---

## Basic Usage

```bash
npm run archive-case -- \
  --lawsuit-id <id> \
  --process-number <numero> \
  --client-name <nome> \
  [--case-type <tipo>]
```

---

## Options

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--lawsuit-id` | `-l` | ✅ Yes | ID do caso no sistema |
| `--process-number` | `-p` | ✅ Yes | Numero do processo judicial |
| `--client-name` | `-c` | ✅ Yes | Nome do cliente |
| `--case-type` | `-t` | ❌ No | Tipo (SUCUMBENCIAL\|CONTRATUAL\|OTHER) |
| `--help` | `-h` | ❌ No | Mostra ajuda |

---

## Examples

### Arquivamento Simples
```bash
npm run archive-case -- \
  --lawsuit-id 12345 \
  --process-number "0052754-30.2026.8.04.1000" \
  --client-name "Joao da Silva"
```

### Com Tipo de Caso Especificado
```bash
npm run archive-case -- \
  -l 12345 \
  -p "0052754-30.2026.8.04.1000" \
  -c "Maria dos Santos" \
  -t SUCUMBENCIAL
```

### Help
```bash
npm run archive-case -- --help
```

---

## Output

### Success

```
Iniciando Automacao de Arquivamento...

Dados do Caso:
   - Lawsuit ID: 12345
   - Processo: 0052754-30.2026.8.04.1000
   - Cliente: Joao da Silva

Sucesso!

Resultado:
{
  "caseId": "0052754-30.2026.8.04.1000",
  "taskCreated": true,
  "taskId": "task_abc123",
  "protocol": "ARQ-2026-10-08-001",
  "honoraries": "R$ 5.587,36",
  "caseType": "SUCUMBENCIAL"
}

---JSON_OUTPUT---
{
  "status": "success",
  "timestamp": "2026-10-08T15:30:45.123Z",
  "result": { ... }
}
---JSON_OUTPUT---
```

Exit code: **0**

### Error

```
Erro ao executar arquivamento: Transferencia nao encontrada no Asaas

---JSON_OUTPUT---
{
  "status": "error",
  "timestamp": "2026-10-08T15:30:45.123Z",
  "error": "Transferencia nao encontrada no Asaas"
}
---JSON_OUTPUT---
```

Exit code: **1**

---

## Environment Variables

**Required:**
```bash
ADVBOX_TOKEN          # Token Advbox
ASAAS_API_TOKEN       # Token Asaas
```

**Optional:**
```bash
ADVBOX_API_URL        # Default: https://app.advbox.com.br/api/v1
ASAAS_API_URL         # Default: https://api.asaas.com/v3
```

### Setting via .env

Create `.env` file in project root:

```env
ADVBOX_TOKEN=seu_token_aqui
ASAAS_API_TOKEN=seu_token_aqui
```

### Setting via Shell

```bash
export ADVBOX_TOKEN="seu_token_aqui"
export ASAAS_API_TOKEN="seu_token_aqui"
npm run archive-case -- ...
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Sucesso - Arquivamento completo |
| 1 | Erro - Falha na execucao |

---

## Integration with GitHub Actions

O CLI e executado automaticamente pelo workflow do GitHub Actions:

```yaml
- name: 'Execute archiving automation'
  run: |
    npm run archive-case -- \
      --lawsuit-id "${{ env.LAWSUIT_ID }}" \
      --process-number "${{ env.PROCESS_NUMBER }}" \
      --client-name "${{ env.CLIENT_NAME }}" \
      --case-type "${{ env.CASE_TYPE }}"
```

---

## Troubleshooting

### "Argumentos obrigatorios faltando"
Certifique-se de passar todos os 3 argumentos obrigatorios:
```bash
npm run archive-case -- --help
```

### "ADVBOX_TOKEN nao configurado"
Configure a variavel de ambiente:
```bash
export ADVBOX_TOKEN="seu_token"
npm run archive-case -- ...
```

### "Transferencia nao encontrada"
Verifique se:
1. A transferencia existe no Asaas
2. O numero do processo esta correto
3. O cliente esta correto

### CLI nao encontrado
Reinstale dependencias:
```bash
npm install
npm run build
```

---

## Advanced Usage

### Programmatic Execution

```bash
# Redirect output to file
npm run archive-case -- -l 123 -p "0000000-00.0000.0.00.0000" -c "Client" > output.log

# Parse JSON output
npm run archive-case -- ... | grep -A 20 "---JSON_OUTPUT---" | tail -n +2 | head -n -1 | jq .
```

### Batch Processing

```bash
#!/bin/bash

while IFS=',' read -r lawsuit_id process_number client_name; do
  echo "Processing: $client_name"
  npm run archive-case -- \
    --lawsuit-id "$lawsuit_id" \
    --process-number "$process_number" \
    --client-name "$client_name"
  sleep 2
done < cases.csv
```

---

## See Also

- [GitHub Actions Integration](./GITHUB_ACTIONS_INTEGRATION.md)
- [Webhook API Documentation](./WEBHOOK_API.md)
- [Implementation Status](../IMPLEMENTATION_STATUS.md)
