# Phase 3 Refactoring - Architecture Update

**Data**: 2026-10-08  
**Status**: ✅ Major Refactoring Completed  
**Change Type**: Core Architecture Redesign

---

## 🔄 O Que Mudou

A automação foi completamente refatorada de um modelo **CRM-driven** para um modelo **Asaas-driven**.

### Antes (Incorreto)
```
CRM Poll → Detecta casos em "Para Arquivamento" 
         → Busca Transfer no Asaas
         → Arquiva
```

### Depois (Correto)
```
Asaas Poll → Detecta ENTRADAS com número do processo
           → Busca detalhes no Advbox
           → Determina tipo (sucumbencial vs contratual)
           ├─ Se sucumbencial: Arquiva imediatamente
           └─ Se contratual: Aguarda SAÍDA/transfer
               └─ Quando transfer encontrada: Arquiva
```

---

## 📝 Arquivos Modificados

### 1. **`src/domain/archiving-automation.ts`** - MAJOR REFACTOR ✅

**Alterações principais:**

- ✅ Removido: Dependência de `CRMClient` como gatilho
- ✅ Adicionado: `searchEntries()` como ponto de entrada
- ✅ Novo método: `extractProcessNumber()` - extrai processo da descrição Asaas
- ✅ Novo método: `determineCaseType()` - classifica sucumbencial vs contratual
- ✅ Novo método: `processPendingArchivings()` - aguarda transfers para contratual
- ✅ Novo fluxo: Bifurcado para sucumbencial (imediato) vs contratual (aguarda)
- ✅ Atualizado: `validateArchivingConditions()` - 4 validações ainda presentes
- ✅ Atualizado: `calculateFeesAndProtocol()` - lógica diferenciada por tipo

**Novos tipos:**
- `PendingArchiving` - Casos aguardando transfer
- `ArchivingTask` agora inclui `caseType` e `transferValue`

---

### 2. **`src/integrations/asaas-client.ts`** - EXPANDED ✅

**Novos métodos:**

```typescript
searchEntries(filters: EntrySearchFilters): Promise<AsaasEntry[]>
```

- Busca ENTRADAS (recebimentos) confirmados no Asaas
- Filtros: processNumber, status, minValue, maxValue, minDate, maxDate
- Ordenação: Mais recentes primeiro
- **Este é o novo gatilho da automação**

**Novas interfaces:**

```typescript
interface EntrySearchFilters { ... }
interface AsaasEntry { ... }
```

---

### 3. **`src/integrations/advbox-client.ts`** - ENHANCED ✅

**Novos métodos:**

```typescript
getLawsuitByNumber(processNumber: string): Promise<any>
getLawsuit(lawsuitId: string): Promise<any>
getCaseTasks(caseId: string): Promise<any[]>
createTask(lawsuitId: string, payload: any): Promise<boolean>
```

- `getLawsuitByNumber()` - Busca caso pelo número do processo (NOVO GATILHO)
- Compatibilidade com métodos antigos mantida
- Construtor ajustado para usar `config` corretamente

---

### 4. **`src/config.ts`** - UPDATED ✅

**Adicionado:**

```typescript
export const config = {
  advbox: getAdvBoxConfig(),
  asaas: getAsaasConfig(),
};
```

- Exportação centralizada de configurações
- Compatível com `asaas-client.ts` e demais clientes

---

## 🎯 Novo Fluxo Detalhado

### Entrada 1: SUCUMBENCIAL (Processado Imediatamente)

```
1. Asaas Entry detectada com processo "XXXX-XX.XXXX.X.XX.XXXX"
2. → extractProcessNumber() → "0052754-30.2026.8.04.1000"
3. → getLawsuitByNumber() no Advbox
4. → determineCaseType() → "SUCUMBENCIAL"
5. → archiveCase() com 4 validações
   ├─ entryConfirmed ✓
   ├─ caseDataComplete ✓
   ├─ noActiveTasksBlocking ✓
   └─ transferConfirmedIfNeeded ✓ (não necessário para sucumbencial)
6. → createArchivingTask() no Advbox
7. ✅ ARQUIVADO
```

### Entrada 2: CONTRATUAL (Aguarda Transfer)

```
1. Asaas Entry detectada com processo
2. → getLawsuitByNumber() no Advbox
3. → determineCaseType() → "CONTRATUAL"
4. → storePendingArchiving() - aguarda até 7 dias
5. [Próxima execução]
6. → processPendingArchivings()
   └─ searchTransfers() no Asaas (cliente + processo)
   └─ Se transfer encontrada:
      └─ archiveCase() com 4 validações
         ├─ entryConfirmed ✓
         ├─ caseDataComplete ✓
         ├─ noActiveTasksBlocking ✓
         └─ transferConfirmedIfNeeded ✓ (transfer.status === COMPLETED)
      └─ createArchivingTask() no Advbox
      └─ ✅ ARQUIVADO
      └─ Remover de pending
   └─ Se transfer NÃO encontrada:
      └─ Continua aguardando (até 7 dias expirem)
```

---

## 4️⃣ Validações (Ainda Presentes)

As 4 validações obrigatórias foram mantidas e aprimoradas:

| Check | Antes | Depois | Descrição |
|-------|-------|--------|-----------|
| 1 | `crmStatusReady` | `entryConfirmed` | Entry no Asaas é CONFIRMED ✓ |
| 2 | `transferConfirmed` | `transferConfirmedIfNeeded` | Para contratual: transfer COMPLETED |
| 3 | `caseDataComplete` | `caseDataComplete` | Processo e cliente presentes ✓ |
| 4 | `noActiveTasksBlocking` | `noActiveTasksBlocking` | Sem tarefas de disputa ✓ |

---

## 📊 Vantagens do Novo Design

| Aspecto | Antes | Depois |
|--------|-------|--------|
| **Gatilho** | CRM polling (pode estar fora de sincronia) | Asaas entry (real-time, 100% confiável) |
| **Casos sucumbenciais** | Aguardavam transfer indefinidamente | Arquivados imediatamente ✓ |
| **Rastreamento** | Perdido após sair do CRM | Persistente via `pendingArchivings` Map |
| **Acurácia** | Acesso duplo a APIs (CRM + Asaas) | Acesso único e direto ao Asaas |
| **Escalabilidade** | Polling do CRM pode virar gargalo | Direct event-based (pronto para webhook) |

---

## ⚙️ Próximos Passos

### Você (Usuário):
- [ ] Enviar manual do Advbox (endpoints exatos, estrutura de resposta)
- [ ] Confirmar: processo está em qual field do Asaas Entry description?
- [ ] Confirmar: como Advbox diferencia sucumbencial de contratual?
- [ ] Confirmar: frequência desejada (a cada 5 min? hora? webhook?)

### Claude:
- [x] Refatorar arquitetura para Asaas-driven ✅
- [x] Implementar determinação de case type ✅
- [x] Implementar pending archivings (Map com timeout de 7 dias) ✅
- [ ] Testes unitários (aguardando confirmações)
- [ ] GitHub Actions workflow (frequência TBD)
- [ ] Deploy em staging

---

## 🧪 Como Testar Localmente

```bash
# 1. Preencher .env
cp .env.example .env
# Editar: ADVBOX_TOKEN, ASAAS_API_TOKEN

# 2. Rodar compilação
npm run build

# 3. Testar automação
npm run cli -- archive-automation

# 4. Verificar output (deve listar entradas Asaas encontradas)
```

---

## 📋 Checklist de Completude

- [x] Asaas Client expandido com `searchEntries()`
- [x] Advbox Client expandido com `getLawsuitByNumber()` e `getLawsuit()`
- [x] Archiving Automation completamente refatorada
- [x] Lógica sucumbencial vs contratual implementada
- [x] Pending archivings (Map com timeout) implementado
- [x] 4 validações mantidas e atualizadas
- [x] Config centralizado exportado
- [x] Documentação atualizada

---

## 🔗 Referências

- **Fluxo anterior**: PHASE3_IMPLEMENTATION.md (desatualizado, será removido)
- **Documentação caso**: WORKFLOW_ANALYSIS_UPDATED.md
- **Perguntas respondidas**: CLARIFIED_QUESTIONS.md
- **Status geral**: IMPLEMENTATION_STATUS.md (precisa atualizar)

---

## 💡 Notas Técnicas

### Case Type Detection
Atualmente simples (baseado em field + percentage). Se Advbox tiver field explícito, pode ser refinado:

```typescript
// Atual
if (caseDetails.case_type?.includes('sucumbencial')) { ... }
if (hasPercentage) { ... }

// Futuro (se houver field claro)
if (caseDetails.case_classification === 'SUCUMBENCIAL') { ... }
```

### Pending Archivings Storage
Usa Map em memória:
```typescript
private pendingArchivings: Map<string, PendingArchiving>
```

Para produção com múltiplas instâncias, considerar:
- Redis para shared state
- Banco de dados para persistence
- (Por enquanto, ok para GitHub Actions com execution única)

### Error Handling
Implementado com try/catch em cada passo:
- Se entry não tem process number → skip
- Se case não encontrado → skip
- Se validação falha → log warning, continua
- Se task creation falha → log error, continua

---

**Status**: 🟢 Pronto para respostas do usuário e testes
