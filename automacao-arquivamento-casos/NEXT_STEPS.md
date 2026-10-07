# 🎯 Próximos Passos - Status e Ações

## 📊 Status Atual

**Data**: 07/10/2026 18:30  
**Progresso**: Análise de workflow completa ✅ | Implementação: ⏸️ Bloqueada

### ✅ O Que Já Foi Feito

#### Fase 1: Extração de Percentuais (COMPLETA)
- [x] Sistema robusto de descoberta do campo de percentual
- [x] Debug script para inspecionar estrutura da API
- [x] GitHub Actions workflow para execução remota
- [x] Documentação completa de troubleshooting

**Arquivos**:
- `debug-api-fields.js` - Inspeciona campos da API
- `retrieve-archived-cases.js` - Extrai casos com percentuais
- `.github/workflows/debug-api-fields.yml` - Workflow GHA
- `PERCENTAGE_FIELD_TRACKING.md` - Documentação detalhada
- `QUICK_START_DEBUG.md` - Quick start para debug

---

#### Fase 2: Análise de Workflow (COMPLETA)
- [x] Análise frame-by-frame do vídeo (10 frames)
- [x] Identificação de 7 etapas do processo
- [x] Mapeamento de gatilhos e validações
- [x] Documentação de fluxo com diagrama ASCII

**Arquivos**:
- `WORKFLOW_ANALYSIS.md` - Análise detalhada de cada frame
- `AUTOMATION_FLOW.md` - Diagrama e fluxo de automação
- `IMPLEMENTATION_QUESTIONS.md` - 9 perguntas críticas

---

### ⏸️ O Que Está Bloqueado

**Bloqueador**: Faltam respostas a 6 perguntas CRÍTICAS  
**Impacto**: Não é seguro implementar automação sem estas respostas

| # | Pergunta | Status | Prioridade |
|---|----------|--------|-----------|
| Q1 | Campo que identifica CONTRATUAL vs SUCUMBENCIAL | ❓ SEM RESPOSTA | 🔴 CRÍTICA |
| Q2 | Nome exato da fase "Rh/Financeiro/Depósito realizado" | ❓ SEM RESPOSTA | 🔴 CRÍTICA |
| Q3 | Endpoint para criar tarefa "ARQUIVAMENTO DEFINITIVO" | ❓ SEM RESPOSTA | 🔴 CRÍTICA |
| Q4 | Como registrar o protocolo de arquivamento | ❓ SEM RESPOSTA | 🔴 CRÍTICA |
| Q5 | O que é "repasse" no Asaas e como identificar | ❓ SEM RESPOSTA | 🔴 CRÍTICA |
| Q6 | Campo comum entre Advbox e Asaas para cross-ref | ❓ SEM RESPOSTA | 🔴 CRÍTICA |
| Q7 | Estado exato do case quando valor cai em conta | ❓ SEM RESPOSTA | 🟡 ALTA |
| Q8 | Validações obrigatórias antes de arquivar | ❓ SEM RESPOSTA | 🟡 ALTA |
| Q9 | Estrutura real dos dados retornados pela API | ❓ SEM RESPOSTA | 🟡 ALTA |

---

## 📋 Como Desbloquear a Implementação

### Passo 1: Responder Perguntas Críticas

Você precisa consultar:
1. **Documentação da API do Advbox** (v1)
   - Estrutura de resposta para `GET /lawsuits/{id}`
   - Endpoints para criar tarefas
   - Como registrar protocolo de arquivamento
   
2. **Advbox Platform Directly** (interface)
   - Qual campo/interface marca um caso como CONTRATUAL?
   - Como as fases são estruturadas?
   - Como criar tarefa via API?

3. **Documentação da API Asaas**
   - Estrutura de transferências
   - Como identificar "repasse"
   - Campos de referência cruzada

4. **Sua Base de Dados/CRM**
   - Como você currently mapeia entre Advbox e Asaas?
   - Qual campo é usado como "chave estrangeira"?

---

### Passo 2: Preencher Respostas

Crie um arquivo `API_RESPONSES.md` com:

```markdown
# Respostas às Perguntas Críticas

## Q1: Como distinguir CONTRATUAL de SUCUMBENCIAL?
Resposta: [Sua resposta aqui]
Exemplo: campo `case_type = "CONTRATUAL"` ou `archiving_reason = "WON"`

## Q2: Nome exato da fase "Rh/Financeiro/Depósito realizado"
Resposta: [Sua resposta aqui]
Exemplo: API retorna `current_phase = "rh_financeiro_deposito_realizado"`

## Q3: Endpoint para criar tarefa
Resposta: [Sua resposta aqui]
Exemplo: `POST /v1/lawsuits/{id}/tasks`

[... etc para Q4-Q9]
```

---

### Passo 3: Validar com Debug Script

Após responder as perguntas:

```bash
# 1. Executar debug para confirmar estrutura real
export ADVBOX_TOKEN="seu_token"
node debug-api-fields.js

# 2. Inspecionar arquivo gerado
cat /tmp/api_debug_first_lawsuit.json

# 3. Verificar se campos existem:
# - Procurar Q1 field (CONTRATUAL identifier)
# - Procurar Q2 field (Phase/Status field)
# - Procurar Q9 fields (API structure)
```

---

### Passo 4: Implementar Automação

Após confirmação das respostas:

```javascript
// Será criado: automacao-arquivamento-casos/archiving-automation.js
// Com 7 funções principais:

1. localizarCasoNoAdvbox(processNumber)
2. validarTipoDeCase(caseData)  // ← Usa resposta Q1
3. buscarRepasseNoAsaas(processNumber, valor)  // ← Usa resposta Q5
4. transicionarFaseAdvbox(caseId, novaFase)  // ← Usa resposta Q2
5. criarTarefaArquivamento(caseId, protocolo)  // ← Usa resposta Q3
6. registrarProtocolo(caseId, dados)  // ← Usa resposta Q4
7. notificarGabi(resultado)
```

---

## 🎬 Fluxo Sugerido de Implementação

### Fase 3: Setup e Validação (1-2 dias)
```
┌─ Responder Q1-Q9
├─ Criar API_RESPONSES.md
├─ Executar debug-api-fields.js
├─ Validar respostas com dados reais
└─ Atualizar este documento com descobertas
```

### Fase 4: Desenvolvimento (3-5 dias)
```
┌─ Implementar archiving-automation.js
├─ Criar testes unitários
├─ Testar com casos REAIS (não produção)
├─ Validar fluxo de erros
└─ Deploy em staging
```

### Fase 5: Deploy em Produção (1-2 dias)
```
┌─ Aprovação final de Gabi
├─ Deploy do GitHub Actions workflow
├─ Monitoramento inicial
├─ Alertas para falhas
└─ Documentação de runbook
```

---

## 📖 Documentação Necessária (Próximos Passos)

Assim que tiver as respostas, criar:

1. **API_RESPONSES.md** ← Você vai preencherk
2. **archiving-automation.js** ← Será desenvolvido
3. **archiving-automation.test.js** ← Testes unitários
4. **RUNBOOK.md** ← Manual de operação
5. **TROUBLESHOOTING.md** ← Guia de problemas
6. **.github/workflows/auto-archiving.yml** ← GitHub Actions

---

## ✅ Checklist de Desbloquei

Quando você tiver respondido tudo isto, me avise:

- [ ] Q1 Respondida (Field CONTRATUAL)
- [ ] Q2 Respondida (Phase field name)
- [ ] Q3 Respondida (Task endpoint)
- [ ] Q4 Respondida (Protocol registration)
- [ ] Q5 Respondida (Asaas repasse)
- [ ] Q6 Respondida (Cross-reference field)
- [ ] Q7 Respondida (Case state when value arrives)
- [ ] Q8 Respondida (Validations required)
- [ ] Q9 Respondida (API data structure)
- [ ] API_RESPONSES.md criado
- [ ] debug-api-fields.js executado com sucesso
- [ ] Respostas validadas com dados reais

**Quando tudo estiver ✅**, pronto para implementar a Fase 4.

---

## 🚀 Resumo em Uma Linha

**O que fazer agora**: Consulte as documentações de API do Advbox e Asaas, responda as 9 perguntas em `IMPLEMENTATION_QUESTIONS.md`, e mande para validar.

**Quanto tempo**: ~2-4 horas de investigação + validação

**Próximo milestone**: Implementação da automação em código (Fase 4)

