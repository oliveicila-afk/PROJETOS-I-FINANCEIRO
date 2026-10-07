# Perguntas Críticas para Implementação da Automação

Baseado na análise do vídeo, identifiquei as seguintes informações estruturais que precisamos confirmar para implementar a automação corretamente:

## 🎯 Seção 1: Identificação de Casos Contraturais

### Q1: Como distinguir CONTRATUAL de SUCUMBENCIAL?
**Contexto**: No vídeo, há referência a "Sucumbencial Rejane Souza de Carvalho" (responsável) vs "Maria Solange de Carvalho" (cliente contratante no contrato). 

**Opções**:
- [ ] Campo no Advbox marca explicitamente `tipo = "CONTRATUAL"` ou `tipo = "SUCUMBENCIAL"`?
- [ ] Existe na resposta da API um campo como `case_type`, `archiving_reason`, `fee_type`?
- [ ] É deduzido pela existência de um contrato em anexo?
- [ ] Existe na estrutura de "Tipo de ação" (ex: "SEGURO PRESTAMISTA")?

**Informação necessária**: Qual é o campo/valor exato da API que identifica um caso como CONTRATUAL?

---

## 🎯 Seção 2: Fases do Processo no Advbox

### Q2: Como a API expõe as fases/etapas do processo?
**Contexto**: No vídeo vemos mudanças de fase:
1. "Rh/Financeiro/Depósito realizado" (quando valor cai em conta)
2. "Arquivamento/Arquivamento" (próxima fase)
3. "Arquivamento Definitivo de Cliente" (tarefa final)

**Opções**:
- [ ] Há um campo `current_phase` ou `workflow_stage` na resposta de um case?
- [ ] As fases são registradas em um array `phases` ou `milestones`?
- [ ] Precisamos consultar um endpoint diferente (ex: `/lawsuits/{id}/activities` ou `/lawsuits/{id}/workflow`)?
- [ ] A fase é determinada pelo último evento/atividade registrada?

**Informação necessária**: 
- Qual é o nome exato do campo de fase na API?
- Qual é o valor exato que identifica "Rh/Financeiro/Depósito realizado"?
- Qual é o valor que identifica "Arquivamento/Arquivamento"?
- Como programaticamente movemos um case de uma fase para outra?

---

## 🎯 Seção 3: Tarefas e Protocolos

### Q3: Como criar uma tarefa "ARQUIVAMENTO DEFINITIVO DE CLIENTE"?
**Contexto**: No Frame 8-9, vemos uma tarefa criada com score de "1 pts" e um protocolo registrado com detalhes de honorários.

**Opções**:
- [ ] Existe um endpoint para criar tarefas: `POST /lawsuits/{id}/tasks`?
- [ ] A tarefa é criada através de um comentário marcado com `@mention` ou `#tag`?
- [ ] Existe um tipo de tarefa pré-definido chamado "ARQUIVAMENTO_DEFINITIVO_CLIENTE"?
- [ ] O score "1 pts" é calculado automaticamente ou precisa ser informado?

**Informação necessária**:
- Qual é o endpoint e payload para criar esta tarefa?
- Qual é o campo/nome exato da tarefa no sistema?
- Como registramos o "protocolo" com os detalhes de honorários?

---

### Q4: Como registrar o Protocolo de Arquivamento?
**Contexto**: Frame 9 mostra um texto de protocolo com campos:
```
**Honorários contratuais iniciais**: R$ 0,00
**Honorários sucumbenciais**: R$ 0,00
**Honorários contratuais de Dano**: R$ 3.073,81
**Valor total de honorários**: R$ 3.073,81
**Nota fiscal emitida**: (x) Sim
```

**Opções**:
- [ ] É um comentário registrado na tarefa?
- [ ] É um campo estruturado `archiving_protocol` no case?
- [ ] É um documento anexado?
- [ ] Existe um endpoint dedicado: `POST /lawsuits/{id}/archiving-protocol`?

**Informação necessária**:
- Qual é o endpoint e estrutura para registrar o protocolo?
- Quais campos são obrigatórios?
- Como ligamos honorários específicos ao protocolo?

---

## 🎯 Seção 4: Integração com Asaas

### Q5: Como identificar o "repasse" (transferência) no Asaas?
**Contexto**: O vídeo menciona que "a automação só vai arquivar quando identificar o repasse no asaas, ou seja, a transferência no asaas para a cliente".

**Opções**:
- [ ] "Repasse" = Transferência ENVIADA para o cliente (outgoing payment)?
- [ ] "Repasse" = Transferência RECEBIDA pela conta (incoming payment)?
- [ ] "Repasse" = Um tipo específico de transação com flag ou status?

**Informação necessária**:
- Qual é o tipo/status de transação no Asaas que representa um "repasse"?
- Como identificamos que o repasse é para o cliente específico?
- Qual é o campo no Asaas que referencia o número de processo ou cliente?
- Qual é o endpoint e filtros para buscar repasses: `GET /transfers?...` ou `GET /payments?...`?

---

### Q6: Como cruzar dados entre Advbox e Asaas?
**Contexto**: Precisamos de um identificador comum para saber qual transferência no Asaas corresponde a qual caso no Advbox.

**Opções**:
- [ ] Usar o número de processo (CNJ) como identificador?
- [ ] Usar o nome do cliente para matching?
- [ ] Usar o valor como identificador secundário?
- [ ] Existe um campo em Asaas que armazena a "case_id" do Advbox?

**Informação necessária**:
- Qual é o campo que Asaas usa como referência a um caso do Advbox?
- Se não existir, qual é a estratégia recomendada para cross-reference?
- Como distinguimos um repasse acidental de um repasse legítimo do case?

---

## 🎯 Seção 5: Fluxo Temporal

### Q7: Qual é a sequência exata de eventos?
**Contexto**: Precisamos saber em que ordem os eventos ocorrem para determinar os gatilhos corretos.

**Perguntas**:
1. Quando o financeiro reporta "valor creditado em conta" (Frame 1), já existe uma entrada/movimentação no Advbox?
   - [ ] O case já está marcado como "Concluído"?
   - [ ] O caso já está na fase "Rh/Financeiro/Depósito realizado"?
   - [ ] Precisamos fazer a transição manualmente?

2. Após transferir o valor ao cliente no Asaas, quanto tempo até o caso poder ser arquivado?
   - [ ] Imediatamente?
   - [ ] No próximo dia útil?
   - [ ] Existe uma validação de reconciliação?

3. O processo de "Arquivamento Definitivo" deve ser:
   - [ ] Totalmente automático (quando repasse é identificado)?
   - [ ] Semi-automático (criar tarefa, aguardar aprovação)?
   - [ ] Manual (apenas notificar Gabi)?

**Informação necessária**:
- Qual é o estado exato do case quando "valor creditado em conta" é reportado?
- Qual é o gatilho preciso que autoriza a automação a prosseguir?

---

## 🎯 Seção 6: Validações e Segurança

### Q8: Quais são as validações obrigatórias antes de arquivar?
**Contexto**: Frame 9 mostra um checklist de validações.

**Opções**:
- [ ] Valor em conta ≥ honorários do escritório?
- [ ] Valor de repasse no Asaas ≈ (Valor em conta - Honorários)?
- [ ] Nota fiscal deve estar emitida?
- [ ] Todos os documentos (contrato, sentença, recibo) devem estar anexados?
- [ ] Cliente deve ter confirmado recebimento?

**Informação necessária**:
- Qual é a margem de erro aceitável entre valores (ex: R$ 1 de diferença)?
- Se uma validação falhar, deve cancelar tudo ou apenas notificar?
- Qual é o fluxo de exceção/erro?

---

## 🎯 Seção 7: Implementação Técnica

### Q9: Qual é a estrutura de dados esperada da API?
**Para validar se conseguimos extrair as informações necessárias, precisamos confirmar os campos da API do Advbox:**

```javascript
// Esperamos que GET /lawsuits/{id} retorne:
{
  "id": "...",
  "process_number": "0052754-30.2026.8.04.1000",
  "responsible": "Maria Solange de Carvalho",
  "status": "Concluído",
  "case_type": "CONTRATUAL", // ← Q1: Qual é o nome exato?
  "current_phase": "Rh/Financeiro/Depósito realizado", // ← Q2: Qual é o nome exato?
  "fee_percentage": 35.0, // ou qual é o campo?
  "fees_money": 3073.81,
  "created_at": "...",
  "updated_at": "...",
  "activities": [...], // ou existe endpoint separado?
  "tasks": [...], // ou existe endpoint separado?
  // Outros campos relevantes?
}
```

**Informação necessária**:
- Confirmar os nomes exatos dos campos
- Confirmar a estrutura de atividades/tarefas
- Existem campos faltando?

---

## 📋 Resumo - Respostas Críticas Necessárias

Para implementar a automação com confiança, você precisa responder:

| # | Pergunta | Resposta | Prioridade |
|---|----------|----------|-----------|
| Q1 | Campo que identifica CONTRATUAL vs SUCUMBENCIAL | ? | 🔴 CRÍTICA |
| Q2 | Nome exato da fase "Rh/Financeiro/Depósito realizado" na API | ? | 🔴 CRÍTICA |
| Q3 | Endpoint para criar tarefa "ARQUIVAMENTO DEFINITIVO" | ? | 🔴 CRÍTICA |
| Q4 | Como registrar o protocolo de arquivamento | ? | 🔴 CRÍTICA |
| Q5 | O que é "repasse" no Asaas e como identificar | ? | 🔴 CRÍTICA |
| Q6 | Campo comum entre Advbox e Asaas para cross-reference | ? | 🔴 CRÍTICA |
| Q7 | Estado exato do case quando valor cai em conta | ? | 🟡 ALTA |
| Q8 | Validações obrigatórias antes de arquivar | ? | 🟡 ALTA |
| Q9 | Estrutura real dos dados retornados pela API | ? | 🟡 ALTA |

---

## 🔧 Próximo Passo Sugerido

Assim que estas respostas forem fornecidas, poderei:
1. Implementar os endpoints/funções corretos
2. Criar os gatilhos de automação
3. Desenvolver a lógica de validação
4. Testar com dados reais

