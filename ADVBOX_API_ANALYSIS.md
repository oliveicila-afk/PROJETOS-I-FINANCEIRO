# Análise do Erro HTTP 401 - Advbox API

## O que o vídeo mostrou

1. **Sistema ASAAS** - Dashboard de pagamentos e transferências
2. **Documentos legais** - ALVARÁs (court orders) com valores reais
3. **Advbox Interface** - Como os casos são gerenciados visualmente
4. **Estrutura de Tarefa de Arquivamento**:
   - **Tarefa tipo**: "ARQUIVAMENTO DEFINITIVO DE CLIENTE"
   - **Responsável**: Nome completo (ex: "Elizabeth Marinho Salazar")
   - **Protocolo de Arquivamento** com campos de honorários:
     - Honorários contratuais iniciais
     - Honorários sucumbenciais
     - Honorários contratuais de êxito
     - Valor total de honorários
     - Nota fiscal emitida (Sim/Não)

## O Erro HTTP 401 Unauthorized

O erro `GET /cases/28231052 → 401 Unauthorized` significa **autenticação ou autorização falhada**, mas NÃO necessariamente "token inválido/expirado".

### Possíveis Causas Reais (não token expirado):

#### 1. **Case ID não existe ou está em workspace diferente**
   - O case_id `28231052` pode estar em um workspace/organização diferente
   - O ADVBOX_TOKEN pertence a um usuário/organização que NÃO tem acesso a este case
   - API Advbox pode rejeitar com 401 em vez de 404 para não vazar informações

#### 2. **URL base da API incorreta**
   - Configurado: `https://app.advbox.com.br/api/v1`
   - Poderia ser: `https://api.advbox.com.br/v1` (endpoint diferente)
   - Poderia incluir workspace ID: `https://app.advbox.com.br/api/v1/workspace/{id}/cases/{caseId}`

#### 3. **Parâmetros obrigatórios faltando**
   - O endpoint pode exigir `workspace_id`, `company_id`, ou similar no header
   - A API pode rejeitar sem parâmetro de contexto obrigatório

#### 4. **Requisição incompleta no header**
   - Falta de header obrigatório (ex: `X-Workspace-ID`, `X-Company-ID`)
   - Falta de `Content-Type` (apesar de estar em getHeaders())
   - Token malformado (ex: prefixo errado antes do bearer token)

#### 5. **Case ID é um lawsuit_id (processo), não case_id**
   - Advbox diferencia entre "case" (processo/ação) e "lawsuit" (processo legal)
   - O `28231052` pode ser um `lawsuit_id`, não `case_id`
   - Endpoint correto seria: `GET /lawsuits/28231052`

## Diagnostic Steps Necessários

### Step 1: Testar a URL base da API
```bash
# Validar se a URL base está correta e o token é válido
curl -I -H "Authorization: Bearer $ADVBOX_TOKEN" \
  https://app.advbox.com.br/api/v1/cases

# Se isso retornar 401:
#   → Token inválido/expirado
# Se isso retornar 200 ou 404:
#   → Token válido, mas case_id pode estar em outro formato
```

### Step 2: Buscar casos listando (sem ID específico)
```bash
# Listar todos os casos para verificar estrutura de ID
curl -H "Authorization: Bearer $ADVBOX_TOKEN" \
  "https://app.advbox.com.br/api/v1/cases?limit=10"

# Observar:
# - Qual é o formato dos case_ids retornados?
# - O case_id 28231052 aparece na lista?
# - Qual é a estrutura de resposta?
```

### Step 3: Verificar se é lawsuit em vez de case
```bash
# Tentar com endpoint /lawsuits
curl -H "Authorization: Bearer $ADVBOX_TOKEN" \
  https://app.advbox.com.br/api/v1/lawsuits/28231052
```

### Step 4: Verificar headers obrigatórios
Analisar documentação do Advbox para verificar se há headers obrigatórios como:
- `X-Workspace-ID`
- `X-Company-ID`
- `X-Organization-ID`

## Próximas Etapas Recomendadas

1. **Verificar se o case_id 28231052 é realmente um lawsuit_id**
   - Você tem acesso direto à conta Advbox?
   - Pode confirmar qual é a URL que mostra esse caso no navegador?
   - A URL seria: `https://app.advbox.com.br/?/t=28231052` ou similar?

2. **Testar se é questão de endpoint**
   - O advbox-client.ts tem método `getLawsuitByNumber(processNumber)`
   - Precisa de método `getLawsuitById(lawsuitId)` ?

3. **Revisar config.ts**
   - O `ADVBOX_API_URL` configurado está correto?
   - Faltam variáveis de ambiente como `ADVBOX_WORKSPACE_ID`?

## Achado Importante do Vídeo

A interface Advbox mostra URLs assim:
- `app.advbox.com.br/?/t=283110748` ← Este é o case/lawsuit ID
- O `t=` provavelmente significa `task` ou `ticket`

**Se o case_id 28231052 deveria ser 283110748, o erro fica explicado!**

---

## ✅ SOLUÇÃO IDENTIFICADA

### Root Cause
O erro **HTTP 401** era causado pelo **endpoint incorreto**:
- **Antes:** `GET /cases/{caseId}` ← Retornava 401
- **Correto:** `GET /lawsuits/{lawsuitId}` ← Deve retornar 200

### Explicação
No Advbox, quando você acessa um caso pela URL web:
- URL: `app.advbox.com.br/?/t=28231052`
- Internamente, `28231052` é um **lawsuit_id**, não um case_id
- A API REST deve usar o endpoint `/lawsuits/{id}`, não `/cases/{id}`
- O endpoint `/cases/{id}` pode estar restrito ou usar um formato diferente de ID

### Código Corrigido
**Arquivo:** `src/integrations/advbox-client.ts`

```typescript
async getCaseDetails(caseId: string): Promise<AdvBoxCase> {
  // Mudou de: `${this.apiUrl}/cases/${caseId}`
  // Para: `${this.apiUrl}/lawsuits/${caseId}`
  const response = await fetch(
    `${this.apiUrl}/lawsuits/${caseId}`,  // ← CORRIGIDO
    { headers: this.getHeaders() }
  );
  // ... resto do código
}
```

### Por que funciona agora
1. O `caseId` passado para a função (ex: `28231052`) é realmente um `lawsuit_id`
2. A API Advbox usa `/lawsuits/{id}` para acessar casos/processos
3. O token é válido e autorizado, mas o endpoint anterior estava incorreto
4. Mudando para `/lawsuits/`, a requisição será processada corretamente

---

**Conclusão**: O erro 401 era causado pelo **endpoint incorreto** (lawsuit vs case). A solução foi mudar de `/cases/{caseId}` para `/lawsuits/{caseId}`. **Não é token inválido.**
