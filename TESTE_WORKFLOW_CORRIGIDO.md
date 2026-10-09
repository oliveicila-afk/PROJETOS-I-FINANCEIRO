# Teste da Automação de Arquivamento - Versão Corrigida

## 📋 Diagnóstico do Erro Original

**Erro encontrado:** `HTTP 401 Unauthorized` ao buscar caso `28231052`

**Causa raiz:** Endpoint incorreto na API Advbox
- Tentava: `GET /cases/28231052` ❌
- Correto: `GET /lawsuits/28231052` ✅

**Análise:** O vídeo de demonstração do Advbox mostrou que o formato de ID é de `lawsuit` (processo), não `case`. A API Advbox diferencia entre:
- `/cases/{caseId}` - Um formato diferente de ID
- `/lawsuits/{lawsuitId}` - O formato correto para acessar processos/cases

## 🔧 Correção Implementada

**Arquivo alterado:** `automacao-arquivamento-casos/src/integrations/advbox-client.ts`

**Mudança:**
```typescript
// Antes
const response = await fetch(
  `${this.apiUrl}/cases/${caseId}`,  // ❌ Retornava 401
  { headers: this.getHeaders() }
);

// Depois
const response = await fetch(
  `${this.apiUrl}/lawsuits/${caseId}`,  // ✅ Correto
  { headers: this.getHeaders() }
);
```

## ✅ Checklist de Validação

- [x] Código TypeScript compila sem erros
- [x] Endpoint mudado de `/cases` para `/lawsuits`
- [x] Mudança commitada com explicação detalhada
- [ ] Teste executado via GitHub Actions
- [ ] Caso 28231052 (Rejane Souza de Carvalho) busca com sucesso
- [ ] Tarefa criada em Advbox
- [ ] Logs registram execução completa

## 🚀 Como Testar

### Opção 1: GitHub Actions (Recomendado)

1. Vá para: https://github.com/oliveicila-afk/PROJETOS-I-FINANCEIRO/actions

2. Clique no workflow: **"Automação - Arquivamento de Casos"**

3. Clique em **"Run workflow"**

4. Preencha os campos:
   - **Branch:** `main` (já selecionado)
   - **case_id:** `28231052`

5. Clique em **"Run workflow"**

6. Acompanhe a execução em tempo real

### Opção 2: Linha de Comando (Requer credenciais locais)

```bash
# Dentro da pasta automacao-arquivamento-casos/
ADVBOX_TOKEN="seu_token_aqui" \
ADVBOX_API_URL="https://app.advbox.com.br/api/v1" \
ASAAS_API_TOKEN="seu_token_asaas_aqui" \
npm run cli -- process-archiving 28231052
```

## 📊 Resultados Esperados

### Sucesso (HTTP 200)
```
📋 Coletando informações de arquivamento para caso 28231052...
✅ Detalhes do caso obtidos
✅ Tarefas do caso obtidas (N tarefas)
✅ Número do processo: XXXX-XX.XXXX.X.XX.XXXX
✅ Verificação de múltiplas ações: (nenhuma outra | ENCONTRADAS)
✅ Atualizar dados do processo
```

Seguido por:
```
✅ ARQUIVAMENTO PROCESSADO COM SUCESSO!

📌 Tarefa criada para Gabriele Nascimento: [TASK_ID]
📋 Informações do protocolo:
   - Cliente: Rejane Souza de Carvalho
   - Processo: [NUMERO_PROCESSO]
   - Motivo: [MOTIVO_ARQUIVAMENTO]
```

### Falha (HTTP 401 ainda)
Se ainda receber `401 Unauthorized`, isso significaria:
- O token é inválido/expirado
- Faltam headers de autenticação obrigatórios
- O Advbox requer parâmetros adicionais na requisição

## 📝 Próximas Etapas

1. **Executar teste via GitHub Actions**
2. **Analisar logs** - Verificar resposta completa do Advbox
3. **Validar estrutura de resposta** - Confirmar que os campos esperados existem
4. **Testar criação de tarefa** - Verificar se tarefa é criada com sucesso
5. **Deploy em produção** - Uma vez validado

## 📌 Informações do Teste

- **Case ID para teste:** `28231052`
- **Cliente:** Rejane Souza de Carvalho
- **Tipo de caso:** SUCUMBENCIAL (baseado na demonstração)
- **Data do teste:** 2026-10-09
- **Workflow:** `.github/workflows/arquivamento-casos.yml`
- **Command:** `npm run cli -- process-archiving 28231052`

## 🔍 Debugging (se necessário)

Se o teste falhar, verifique:

1. **Valide a resposta raw do Advbox:**
```bash
curl -H "Authorization: Bearer $ADVBOX_TOKEN" \
  https://app.advbox.com.br/api/v1/lawsuits/28231052 | jq .
```

2. **Verifique se caso existe:**
   - Acesse: https://app.advbox.com.br
   - Busque por case_id 28231052
   - Confirme que ele existe e é acessível

3. **Verifique permissões do token:**
   - Token pode estar limitado a certos usuários/workspaces
   - Token pode ter escopo limitado a leitura (sem criar tarefas)

4. **Verifique estrutura esperada:**
   - A resposta do API pode ter campos diferentes
   - Pode ser necessário ajustar mapeamento de campos em `AdvBoxCase`

---

**Status:** ✅ **PRONTO PARA TESTE**

O código foi corrigido e commitado. Próximo passo: executar teste via GitHub Actions com o endpoint correto `/lawsuits/28231052`.
