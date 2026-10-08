# Phase 3: Implementação da Automação - Guia de Integração

**Status**: ⏳ Parcialmente Completo - Aguardando Respostas Finais

**Data**: 08/10/2026  
**Fase**: 3 de 4

---

## 📊 O Que Foi Implementado

### ✅ Componentes Criados

1. **`crm-client.ts`** - Cliente para monitorar CRM Financial
   - Método `getFinancialColumns()` - Lista as colunas do quadro Kanban
   - Método `getCasesInColumn()` - Obtém casos em uma coluna específica
   - Método `getCasesReadyForArchiving()` - Busca casos prontos para arquivar
   - Método `getCaseByProcessNumber()` - Busca caso pelo número do processo
   - Método `detectNewArchivedCases()` - Detecta mudanças no CRM

2. **`archiving-automation.ts`** - Orquestrador Principal
   - Método `processArchivingCandidates()` - Loop principal de automação
   - Validação de 4 condições críticas
   - Cálculo de honorários e montagem de protocolo
   - Criação de tarefa de arquivamento no Advbox
   - Suporte para extração de percentual de taxa (5 nomes de campo)

3. **`asaas-client.ts`** - Extensão para buscar transferências ("repasse")
   - Método `searchTransfers()` - Busca transferências por múltiplos filtros
   - Filtros: nome do cliente, número do processo, CPF, status, valor
   - Ordenação automática por data (mais recente primeiro)
   - Método `getTransferDetails()` - Detalhes completos de uma transferência

### 📝 Fluxo da Automação Implementado

```
1. Monitorar CRM (polling ou webhook)
   ↓
2. Detectar casos em "Para Arquivamento" ou "Pagamento Realizado"
   ↓
3. Para cada caso:
   a. Obter dados completos do Advbox (lawsuit API)
   b. Extrair número do processo e nome do cliente
   c. Buscar transferência correspondente no Asaas
      (por nome + número do processo)
   ↓
4. Validar condições:
   - CRM status correto? ✓
   - Transferência confirmada? ✓
   - Dados do caso completos? ✓
   - Nenhuma tarefa bloqueante? ✓
   ↓
5. Se válido:
   - Calcular honorários (% do valor transferido)
   - Gerar protocolo de arquivamento
   - Criar tarefa no Advbox com protocolo
   ↓
6. Registrar sucesso/erro
```

---

## ❓ Respostas Ainda Necessárias

Para completar a integração e colocar em produção, preciso de respostas claras a 5 perguntas:

### Q2: Qual é o endpoint da API para monitorar o CRM?

**Contexto:** 
No código implementei métodos como:
- `GET /crm/boards/financeiro/columns` - listar colunas
- `GET /crm/boards/financeiro/columns/{id}/cases` - casos em uma coluna
- `GET /crm/cases/{id}` - status de um caso específico

**Preciso saber:**
1. Esses endpoints estão corretos?
2. Os nomes das colunas do Financial CRM são exatos?
   - "Conferência Financeira Final"
   - "Em Espera | Pagamento de Aco..."
   - "Depósito Realizado"
   - "Pagamento Realizado"
   - "Para Arquivamento"
3. Há um webhook disponível ao invés de polling?
4. Se polling, qual é a frequência recomendada? (a cada hora? a cada 30 min?)

**Exemplo esperado:**
```json
{
  "columns": [
    {
      "id": "col_financeiro_1",
      "name": "Conferência Financeira Final",
      "position": 1,
      "case_count": 16
    },
    ...
    {
      "id": "col_financeiro_6",
      "name": "Para Arquivamento",
      "position": 6,
      "case_count": 0
    }
  ]
}
```

---

### Q6: Como conectar Advbox ↔ Asaas via API?

**Contexto:**
O código implementa busca de transferência assim:
```typescript
const transfers = await asaasClient.searchTransfers({
  clientName,
  processNumber,
  status: 'COMPLETED',
});
```

**Preciso confirmar:**
1. O campo "description" na transferência Asaas contém o número do processo?
2. O campo "recipient" contém o nome do cliente?
3. Ou existe uma forma diferente de casar os dados?

**Exemplo esperado:**
```json
{
  "id": "transfer_123",
  "value": 5716.04,
  "recipient": "Maria Solange de Carvalho",
  "recipientCpf": "474.795.312-49",
  "description": "Processo 0052754-30.2026.8.04.1000",
  "status": "COMPLETED",
  "type": "PIX",
  "createdAt": "2026-10-06T10:30:00Z"
}
```

---

### Q7: Qual é a frequência recomendada para a automação?

**Contexto:**
O código está pronto para rodar em um GitHub Actions workflow, mas preciso saber:

**Preciso saber:**
1. Deve rodar **a cada hora**? 
2. Ou **uma vez por dia** (qual horário)?
3. Ou **baseado em webhooks** quando um caso muda de coluna?

**Razão:**
- Se a cada hora: implemento `0 * * * *` (todo início de hora)
- Se por dia: implemento `0 10 * * *` (10:00 AM Brasília)
- Se webhook: mudo para uma API endpoint que recebe eventos

**Seu input:**
Você mencionou "constantemente" - isso significa a cada hora está ok?

---

### Q8: Quais são as validações exatas para criar a tarefa?

**Contexto:**
No código implementei 4 validações:

```typescript
checks: {
  crmStatusReady: false,        // Está em "Para Arquivamento"?
  transferConfirmed: false,     // Transferência foi feita?
  caseDataComplete: false,      // Tem process number e client name?
  noActiveTasksBlocking: false, // Nenhuma tarefa bloqueante?
}
```

**Preciso confirmar (para cada validação):**
1. ✅ Caso deve estar em coluna "Para Arquivamento" ou depois?
2. ✅ Transferência deve estar em status "COMPLETED"?
3. ✅ CPF do cliente é necessário ou só nome?
4. ✅ Que tipos de tarefa são "bloqueantes" para arquivamento?
   - Apenas em status "OPEN"?
   - Apenas com certas palavras-chave ("disputa", "análise")?

---

### Q9: Qual é a estrutura exata do protocolo de arquivamento?

**Contexto:**
No vídeo vi este protocolo:
```
PROTOCOLO DE ARQUIVAMENTO - OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS

Honorários contratuais iniciais: R$ 0,00
Honorários sucumbenciais: R$ 0,00
Honorários contratuais de Adm: R$ 3.073,81
Valor total de honorários: R$ 3.073,81
Nota fiscal emitida: ( ) Sim ( ) Não
Observação: "Não restam obrigações..."
```

**Preciso confirmar:**

1. **Honorários contratuais iniciais:**
   - Sempre R$ 0,00?
   - Ou vem do contrato do cliente?

2. **Honorários sucumbenciais:**
   - Sempre R$ 0,00?
   - Ou vem de outras tarefas?

3. **Honorários contratuais de Adm:**
   - É calculado como `valor_transferência * percentual`?
   - Onde obter o percentual? (já implementei extração do caso)

4. **Nota fiscal emitida:**
   - Preenchido automaticamente como "( ) Sim ( ) Não"?
   - Ou deixa em branco para quem arquivar decidir?

5. **Observação:**
   - Sempre o mesmo texto fixo?
   - Ou varia por caso?

6. **Há outros campos no protocolo?**
   - Data de transferência?
   - Valor repassado ao cliente?
   - Número da ordem de depósito?

---

## 🔧 Como Testar/Validar

Uma vez que as 5 respostas forem confirmadas, posso:

1. ✅ **Ajustar endpoints** das APIs se necessário
2. ✅ **Implementar polling/webhook** com frequência correta
3. ✅ **Refinar validações** exatas
4. ✅ **Completar protocolo** com estrutura correta
5. ✅ **Criar testes unitários** para cada validação
6. ✅ **Deploy no GitHub Actions** com scheduler correto
7. ✅ **Monitoramento** (logs, alertas, dashboard)

---

## 📋 Checklist de Respostas Necessárias

- [ ] **Q2** - Endpoints da API CRM e frequência de polling
- [ ] **Q6** - Como casar Advbox ↔ Asaas (campos usados)
- [ ] **Q7** - Frequência da automação (hora, dia, webhook?)
- [ ] **Q8** - Validações exatas para criar tarefa
- [ ] **Q9** - Estrutura do protocolo (campos e valores)

**Uma vez que TODOS os 5 itens acima forem respondidos, posso:**
- Finalizar implementação em < 1 dia
- Deploy em produção em < 1 dia
- Colocar automação funcionando em tempo real

---

## 📁 Arquivos Criados/Modificados

| Arquivo | Status | O Quê |
|---------|--------|-------|
| `src/integrations/crm-client.ts` | ✅ Novo | Client para CRM Financial |
| `src/domain/archiving-automation.ts` | ✅ Novo | Orquestrador principal |
| `src/integrations/asaas-client.ts` | ✅ Atualizado | Adicionado suporte para transferências |
| `PHASE3_IMPLEMENTATION.md` | ✅ Novo | Este documento |
| `.github/workflows/archiving-automation.yml` | ⏳ Próximo | GitHub Actions workflow |

---

## 🚀 Próximos Passos

1. **Você responde as 5 perguntas** (Q2, Q6, Q7, Q8, Q9)
2. **Eu implemento as respostas** nos arquivos acima
3. **Testes e validação** com dados reais
4. **Deploy e monitoramento** em produção

**Tempo estimado:**
- Sua resposta: ~10-15 minutos
- Minha implementação: ~4-6 horas
- Testes: ~2 horas
- Deploy: ~1 hora
- **Total: ~1-2 dias do início ao fim da produção**

---

## 💡 Notas Técnicas

### Sobre o CRM Kanban
O Advbox CRM funciona como um quadro Kanban com colunas. Cada coluna representa um estágio do fluxo financeiro. Casos são movidos entre colunas conforme:
- Conferência financeira é feita
- Depósito é recebido
- Cliente recebe pagamento
- Caso está pronto para arquivar

A automação monitora essas mudanças e dispara quando um caso entra na coluna de arquivamento.

### Sobre Transferências no Asaas
O "repasse" é uma transferência PIX/TED que sai da conta do escritório para a conta do cliente. No Asaas, isso aparece como:
- Tipo: "TRANSFER" ou "PIX"
- Status: "COMPLETED" (quando foi feito)
- Beneficiário: Nome do cliente
- Descrição: Pode conter o número do processo

A automação busca essa transferência para confirmar que o cliente já recebeu seu dinheiro antes de arquivar o caso.

---

## 📞 Dúvidas?

Se tiver dúvidas sobre:
- **Implementação técnica**: Veja o código em `src/`
- **Workflow**: Veja `WORKFLOW_ANALYSIS_UPDATED.md`
- **Perguntas pendentes**: Veja `CLARIFIED_QUESTIONS.md`
- **Status geral**: Veja `NEXT_STEPS_UPDATED.md`
