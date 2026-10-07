# Próximos Passos - Atualizado com Análise Completa do Vídeo

**Status Atual:** ⏸️ Bloqueado - Aguardando respostas às perguntas clarificadas

**Data da análise:** 07/10/2026  
**Vídeo analisado:** 9:40 minutos, 10 frames extraídos  
**Documentação criada:** WORKFLOW_ANALYSIS_UPDATED.md + CLARIFIED_QUESTIONS.md

---

## 📊 Resumo do Que Foi Descoberto

### ✅ Confirmado no Vídeo

1. **Workflow completo documentado** ✅
   - 10 frames analisados em sequência
   - 7 etapas principais identificadas
   - Cronologia clara: 30/09 → 02/10 → 06/10 → 07/10

2. **Caso CONTRATUAL confirmado** ✅
   - Cliente: Maria Solange de Carvalho
   - Processo: 0052754-30.2026.8.04.1000
   - Contrato em Google Drive: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS E HONORÁRIOS ADVOCATÍCIOS"
   - Percentual: 34.97%

3. **Campos da API identificados** ✅
   - ID do caso: 28231052
   - Status: "Concluído"
   - Fases observadas: "Rh/financeiro" → "Rh/financeiro/Depósito realizado" → "Arquivamento/Arquivamento"
   - Anexos disponíveis
   - Tarefas estruturadas

4. **Protocolo de arquivamento capturado** ✅
   ```
   PROTOCOLO DE ARQUIVAMENTO - OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS
   - Honorários contratuais iniciais: R$ 0,00
   - Honorários sucumbenciais: R$ 0,00
   - Honorários contratuais de Adm: R$ 3.073,81
   - Valor total de honorários: R$ 3.073,81
   ```

5. **Gatilhos de automação identificados** ✅
   - Depósito em conta: R$ 8.789,85
   - Fase: "Rh/financeiro/Depósito realizado"
   - Repasse: R$ 5.716,04 (valor bruto - honorários)

6. **Perguntas respondidas** ✅
   - Q1: Identificação CONTRATUAL vs SUCUMBENCIAL ✅
   - Q3: Criar tarefas ✅ ("consegue sim")
   - Q4: Registrar protocolo ✅ ("consegue sim")
   - Q5: O que é repasse ✅ ("é a transferencia ao cliente em si")

### ❓ Ainda Sem Resposta Clara

1. **Q2: Nome exato do field de fase** ❌
   - Reformulada com mais clareza
   - Precisa responder: `status`? `current_phase`? `fase_atual`? outro?

2. **Q6: Como conectar Advbox ↔ Asaas** ❌
   - Reformulada com opções específicas
   - Precisa responder: por número de processo? CPF? ID armazenado?

3. **Q7: Cronologia e timing** ❌
   - NOVO - quanto tempo entre cada etapa?
   - Automação deve rodar a cada hora? Diariamente? Por webhook?

4. **Q8: Validações necessárias** ❌
   - NOVO - quais conditions devem ser satisfeitas?
   - Checklist: status=Concluído? Fase correta? Valor creditado? Transferência em Asaas?

5. **Q9: Estrutura do protocolo** ❌
   - NOVO - de onde vêm os valores exatos?
   - Como preencher "Nota fiscal emitida"?
   - Texto da observação é fixo ou varia?

---

## 🎯 Fase 3: Implementação (Bloqueada)

Não conseguimos iniciar a Fase 3 (desenvolvimento do código) sem as respostas acima.

### Por que essas respostas são críticas:

```
Q2 → Sem saber o nome do field de fase, não consigo:
     ├─ Monitorar mudanças de fase
     ├─ Saber quando a fase está em "Rh/financeiro/Depósito realizado"
     └─ Disparar a busca por transferência no Asaas

Q6 → Sem saber como conectar Advbox ↔ Asaas, não consigo:
     ├─ Buscar a transferência correspondente no Asaas
     ├─ Confirmar que o repasse foi feito
     └─ Disparar a criação da tarefa de arquivamento

Q7 → Sem saber o timing esperado, não consigo:
     ├─ Definir a frequência da automação (hourly? daily?)
     ├─ Implementar retry logic adequada
     └─ Saber quanto tempo esperar entre eventos

Q8 → Sem saber as validações, não consigo:
     ├─ Saber quando é SEGURO criar a tarefa
     ├─ Implementar tratamento de erros correto
     └─ Evitar duplicatas ou arquivamentos prematuros

Q9 → Sem saber a estrutura exata, não consigo:
     ├─ Montar corretamente o payload da tarefa
     ├─ Preencher valores de forma confiável
     └─ Implementar protocolo estruturado
```

---

## 📋 Desbloqueador de Implementação

**Checklist do que foi feito:**
- ✅ Extraído 10 frames do vídeo
- ✅ Análise visual completa de cada frame
- ✅ Documentação em WORKFLOW_ANALYSIS_UPDATED.md (32 KB)
- ✅ Perguntas reformuladas em CLARIFIED_QUESTIONS.md (8 KB)
- ✅ Cronologia, gatilhos e campos identificados
- ✅ 4 de 9 perguntas respondidas

**Checklist para desbloquear Fase 3:**
- ⏳ Responder Q2 reformulada (nome do field de fase)
- ⏳ Responder Q6 reformulada (cross-reference Advbox ↔ Asaas)
- ⏳ Responder Q7 (cronologia e timing)
- ⏳ Responder Q8 (validações necessárias)
- ⏳ Responder Q9 (estrutura do protocolo)

---

## 📖 Documentação Gerada

### Nova: WORKFLOW_ANALYSIS_UPDATED.md (32 KB)
**Conteúdo:**
- Frame-by-frame breakdown (10 frames)
- Dados extraídos de cada etapa
- Cronologia completa (30/09 → 07/10)
- Campos confirmados da API Advbox
- Gatilhos de automação identificados (3)
- Perguntas ainda sem resposta

### Nova: CLARIFIED_QUESTIONS.md (8 KB)
**Conteúdo:**
- Perguntas Q1-Q5 respondidas ✅
- Q2 reformulada com clareza
- Q6 reformulada com opções específicas
- Q7 NOVO - timing das etapas
- Q8 NOVO - validações
- Q9 NOVO - estrutura de dados

### Referência: Arquivo original (não alterado)
- **IMPLEMENTATION_QUESTIONS.md** - Versão anterior com perguntas originais
- **WORKFLOW_ANALYSIS.md** - Versão anterior com análise inicial

---

## 🚀 Roadmap Atualizado

### Fase 1: Extração de Percentual ✅ COMPLETA
- ✅ Script `retrieve-archived-cases.js` funcionando
- ✅ Detecção robusta de múltiplos nomes de campo
- ✅ Análise de padrões de percentuais

### Fase 2: Análise de Workflow ✅ COMPLETA
- ✅ Vídeo assistido e 10 frames extraídos
- ✅ Frame-by-frame analysis documentado
- ✅ Gatilhos identificados
- ✅ Campos da API mapeados
- ✅ Perguntas críticas formuladas
- ⏳ 5 perguntas ainda aguardando respostas

### Fase 3: Implementação ⏸️ BLOQUEADA
Não pode começar sem respostas a Q2, Q6, Q7, Q8, Q9

**Estimativa:** 1-2 dias de desenvolvimento após respostas  
**Componentes a implementar:**
- [ ] `advbox-client.ts` - método para monitorar fases
- [ ] `asaas-client.ts` - método para buscar transferências
- [ ] `archiving-automation.ts` - lógica de orquestração
- [ ] `protocol-builder.ts` - montagem do protocolo
- [ ] Validações e tratamento de erros
- [ ] Testes unitários

### Fase 4: Deploy
Não pode começar antes da Fase 3

**Estimativa:** 1-2 dias  
**Componentes:**
- [ ] GitHub Actions workflow para execução
- [ ] Monitoramento e alertas
- [ ] Dashboard de status
- [ ] Documentação de operação

---

## 💡 Estratégia para Responder as Perguntas

As perguntas reformuladas em **CLARIFIED_QUESTIONS.md** são bem mais específicas e diretas:

### Para Q2:
Simplesmente diga qual é o NOME DO CAMPO. Se não souber exato, pode responder:
- "É o campo `status`"
- "É o campo `current_phase`"
- "Varia: às vezes é `fase`, às vezes `etapa`"
- "Não há um campo específico, a fase está em outro lugar"

### Para Q6:
Escolha qual dos 5 métodos é usado:
1. Número do processo (em qual field do Asaas?)
2. CPF do cliente
3. Nome + Valor + Data
4. ID do caso Advbox armazenado no Asaas
5. Outro método (qual?)

### Para Q7, Q8, Q9:
Essas têm respostas estruturadas. Pode ser conciso, mas preciso.

---

## 📞 Próxima Ação

**O que fazer agora:**

1. Ler o arquivo **CLARIFIED_QUESTIONS.md**
2. Responder as 5 perguntas (Q2, Q6, Q7, Q8, Q9)
3. Confirmar se estou entendendo corretamente as respostas anteriores

**Onde encontrar:**
- Documentação: `/automacao-arquivamento-casos/`
- Análise detalhada: `WORKFLOW_ANALYSIS_UPDATED.md`
- Perguntas: `CLARIFIED_QUESTIONS.md`

**Tempo estimado:** 10-15 minutos para responder todas

**Benefício:** Com essas respostas, conseguimos implementar a automação completa em 2-3 dias.

---

## 📌 Resumo Executivo

| Item | Status | Bloqueador |
|------|--------|-----------|
| Entender workflow | ✅ Completo | Nenhum |
| Extrair campos API | ✅ Parcial | Q2 |
| Conectar Advbox ↔ Asaas | ❌ Pendente | Q6 |
| Timing das etapas | ❌ Pendente | Q7 |
| Validações | ❌ Pendente | Q8 |
| Estrutura protocolo | ❌ Pendente | Q9 |
| Implementação código | ⏸️ Bloqueada | Q2, Q6, Q7, Q8, Q9 |

**Próximo marco desbloqueador:** Respostas a Q2, Q6, Q7, Q8, Q9
