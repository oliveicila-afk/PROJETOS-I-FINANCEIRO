# Análise Detalhada do Workflow de Arquivamento - Video Demonstration

**Data da demonstração:** 07/10/2026  
**Duração:** 9:40 minutos  
**Tipo de caso demonstrado:** CONTRATUAL (Seguro Prestamista)  
**Cliente:** Maria Solange de Carvalho  
**Processo:** 0052754-30.2026.8.04.1000  

---

## 📋 Sequência Completa do Workflow (Frame-by-Frame)

### Frame 1: Comunicação Inicial (WhatsApp)
**Tempo:** 0:00 - 1:00 (início)  
**Sistema:** WhatsApp Web  
**Ator:** Anderson (escritório)  
**Ação:** Comunicação sobre conclusão do caso

**Dados extraídos:**
- **Tipo de caso (inicial):** Sucumbencial Rejane Souza de Carvalho (confunde inicialmente, mas é demonstração de outro caso)
- **Cliente real:** Maria Solange de Carvalho
- **Valor creditado em conta:** R$ 8.789,85 (data: 06/10/2026)
- **Cálculo de honorários:**
  - Honorários de 34,97% do escritório: R$ 3.073,81
  - Valor líquido a ser enviado ao cliente: R$ 5.716,04

**Insights para automação:**
- O valor creditado (R$ 8.789,85) é o VALOR BRUTO antes de deduzir honorários
- O escritório recebe R$ 3.073,81 como honorários
- O cliente recebe R$ 5.716,04 em repasse

---

### Frame 2: Busca no Advbox (falha inicial)
**Tempo:** 1:00 - 2:00  
**Sistema:** Advbox  
**Ação:** Busca por número do processo: `2754-30.2026.80.4.1000`  
**Resultado:** "não retornou nenhum resultado"

**Insights:**
- O número de processo usado na busca é versão CURTA (sem os zeros iniciais)
- A API pode ter variações de formato - precisa de tratamento robusto
- Isso afeta Q6: como fazer o cross-reference entre Advbox e Asaas?

---

### Frame 3: Documentação Judicial
**Tempo:** 2:00 - 3:00  
**Tipo:** PDF Document  
**Arquivo:** SENTENÇA_MARIA_SOLANGE_5217.pdf  
**Documento:** Sentença Judicial

**Partes do processo:**
- **Pólo Passivo:** Banco Bradesco S/A
- **Tipo de sentença:** Decisão sobre indenização pecuniária
- **Conteúdo:** Detalhes sobre defesa apresentada, rejeição de preliminares, etc.

**Insights:**
- Documento prova que o caso foi julgado e decidido
- Pode estar armazenado no Advbox como anexo (confirmado em Frame 4)

---

### Frame 4: Detalhes do Caso no Advbox
**Tempo:** 3:00 - 4:00  
**Sistema:** Advbox  
**URL:** `app.advbox.com.br/074=28231052`  
**Ação:** Visualizando detalhes do caso

**Estrutura do caso:**
- **ID do caso:** 28231052 (importante para referência)
- **Status:** `Concluído` (Completed)
- **Data de conclusão:** quarta, 30/09/2026 (Wednesday, September 30, 2026)
- **Criado por:** Pedro Igor Farias Rodrigues (data: 30/09/2026 14:37)
- **Responsável:** Pedro Igor Farias Rodrigues

**Anexos associados (3 documentos):**
1. ALVARÁ_MARGOA_SOLANGE_1584.pdf
2. SENTENÇA_MARIA_SOLANGE_5217.pdf
3. ACÓRDÃO_MARIA_SOLANGE_5841.pdf

**Campos esperados na API:**
- `id` ou `lawsuit_id` → 28231052
- `status` → "Concluído"
- `conclusion_date` → "2026-09-30"
- `created_by` → pedro_id
- `responsible` → pedro_id
- `attachments[]` → array with 3 items

---

### Frame 5: Contrato no Google Drive
**Tempo:** 4:00 - 5:00  
**Sistema:** Google Drive  
**Arquivo:** 85 Maria Solange - SEGURO final 283.pdf.pdf  
**Documento:** CONTRATO DE PRESTAÇÃO DE SERVIÇOS E HONORÁRIOS ADVOCATÍCIOS

**Informações-chave:**
- **Contratante (cliente):** Maria Solange de Carvalho
  - CPF: 474.795.312-49
  - Endereço: Rua Nogueira, 32, Bairro Santo Antônio, CEP 69550-214, Tefé/AM
  - Email: marisol12@bol.com
  - Cel: 92 98494-3722

- **Contratado (escritório):** THIAGO CALANDRINI OLIVEIRA DOS ANJOS
  - OAB/AM nº 15.899
  - CPF: 992.221.402-49

**Objetivo do contrato:**
- Prestação de assessoria jurídica ao cliente
- "O Contratado compromete-se com o presente termo a prestar Assessoria Jurídica a Contratante no tocante ao ajuizamento e acompanhamento de:"

**Tipo de caso:** CONTRATUAL ✓ (confirmado pela existência e conteúdo do contrato)

**Insights para automação:**
- A identificação de CONTRATUAL vs SUCUMBENCIAL pode ser feita verificando a existência de um contrato no Google Drive
- Caso seja CONTRATUAL, o percentual de honorários está definido no contrato
- Neste caso: 34,97% (como visto no Frame 1)

---

### Frame 6: Processo no ProcJud (Sistema Judicial)
**Tempo:** 5:00 - 6:00  
**Sistema:** ProcJud (sistema externo de processos judiciais)  
**URL:** projud.tjam.jus.br  
**Processo:** 0052754-30.2026.8.04.1000

**Dados do processo:**
- **Classe Processual:** 156 - Cumprimento de sentença
- **Assunto Principal:** 9607 - Contratos Bancários
- **Nível de Sigilo:** Público
- **Requerente:** Maria Solange de Carvalho
  - CPF/CNPJ: 474.795.312-49
  - RG: 1177963-2 SSP/AM
  - Idade: Não informada

- **Requerido:** Banco Bradesco S/A
  - CPF/CNPJ: 60.746.948/0001-12
  - RG: Não Cadastrado

- **Valor da Causa:** R$ 14.283,74
- **Depósito Judicial:** Não há depósitos ou levantamentos cadastrados
- **Auto de Penhorra:** Não há autos de penhorria cadastrados
- **Habilitações Provisórias:** Sem habilitações provisórias cadastradas
- **Trânsito em Julgado:** "Sem Trânsito Cadastrado (clique para cadastrar)"

**Documentos obrigatórios (seção left):**
- Detalhes da Exibição ✓
- Detalhes da Movimentação ✓
- **Documentos** ✓ (selecionado)
- Juntada de Petição de Inicial
- 1.2 Preparação
- 1.3 Preparação
- 1.4 Preparação
- 1.5 Documentos pessoais
- 1.6 Comprovante de residência
- 1.7 Contrato (com processo)
- 1.8 Contrato (com processo)
- 1.9 Contrato Bradesco 3223

**Cross-reference crítico:**
- Número do processo NO ADVBOX: precisa ser `2754-30.2026.80.4.1000` ou similar
- Número do processo NO PROCJUD: `0052754-30.2026.8.04.1000`
- **Padrão de formato:** O Advbox PODE estar armazenando sem os zeros iniciais (explicaria o erro em Frame 2)

---

### Frame 7: Modal de Ação/Lawsuit
**Tempo:** 6:00 - 7:00  
**Sistema:** Advbox (modal popup)  
**Ação:** Detalhes da ação/lawsuit

**Estrutura capturada:**
- **Nome do cliente:** MARIA SOLANGE DE CARVALHO
- **Número do processo (CNJ):** 0052754-30.2026.8.04.1000
- **Partes envolvidas:**
  - Ação para adicionar outras partes
  - Anotações gerais (campo de texto)

- **Grupo de ação:** CONSUMIDOR
- **Tipo de ação:** SEGURO PRESTAMISTA
- **Número do processo (CNJ):** 0052754-30.2026.8.04.1000
- **Botão de ação:** "Analisar dados do processo" (Analyze process data)

**Campos esperados na API:**
- `lawsuit_type` → "SEGURO PRESTAMISTA"
- `action_group` → "CONSUMIDOR"
- `process_number_cnj` → "0052754-30.2026.8.04.1000"
- `parties[]` → array de partes envolvidas

---

### Frame 8: Timeline com Fases do Workflow
**Tempo:** 7:00 - 8:00  
**Sistema:** Advbox (timeline/histórico)  
**Ação:** Alteração de fase do caso

**Dados do evento:**
- **Data do evento:** sexta, 02/10/2026 (Friday, October 2, 2026)
- **Criado por:** Marcella Helena Vasconcelos Costa (data: 02/10/2026 15:49)
- **Responsável pelo processo:** Elisabeth Marinko Salazar
- **Tipo de caso (no lado direito):** Seguro prestamista

**Fases do workflow visíveis no dropdown:**
- FASE ATUAL: RH/FINANCEIRO
- **ARQUIVAMENTO DEFINITIVO DE CLIENTE (PTS)** ← SELECIONADA (highlighted)
- (outras opções não visíveis completamente)

**Tarefa associada:**
- `Tarefa` field: COMENTÁRIO (dropdown)
- Texto: (contém instruções ou anotações)

**Insights críticos para Q2:**
- **RESPOSTA À Q2:** O nome da fase atual é armazenado em um campo que poderia ser chamado:
  - `current_phase` ou
  - `fase_atual` ou
  - `workflow_phase` ou
  - `status_workflow`
  - **Valor observado:** "RH/FINANCEIRO" (texto livre, não um enum)

---

### Frame 9: Tarefa de Arquivamento Definitivo
**Tempo:** 8:00 - 8:30  
**Sistema:** Advbox (task details modal)  
**Tipo de tarefa:** ARQUIVAMENTO DEFINITIVO DE CLIENTE (1 pts)

**Protocolo de Arquivamento:**
```
PROTOCOLO DE ARQUIVAMENTO - OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS

**Honorários contratuais iniciais:** R$ 0,00
**Honorários sucumbenciais:** R$ 0,00
**Honorários contratuais de Adm:** R$ 3.073,81
**Valor total de honorários:** R$ 3.073,81
**Nota fiscal emitida:** () Sim () Não

Observação:
"Não restam obrigações a serem cumpridas, estando todas 
integralmente satisfeitas. Realizada a baixa e o arquivamento no ADVBOX."
```

**Campos da tarefa:**
- `task_type` → "ARQUIVAMENTO DEFINITIVO DE CLIENTE"
- `task_category` → "1 pts" (1 point task)
- `protocol_title` → "PROTOCOLO DE ARQUIVAMENTO - OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS"
- `fees_contractual_initial` → R$ 0,00
- `fees_succumb` → R$ 0,00
- `fees_admin` → R$ 3.073,81
- `fees_total` → R$ 3.073,81
- `invoice_issued` → boolean (não/yes choice)
- `observation` → texto livre
- `date` → 07/10/2026

**Botão de ação:** "Atribuir tarefa" (Assign task)

**Insights para automação:**
- A tarefa é criada MANUALMENTE (não automaticamente)
- Contém protocolo estruturado com os honorários
- A data é 07/10/2026 (diferente da conclusão em 30/09 e da fase change em 02/10)
- **CRONOLOGIA:**
  - 30/09: Caso criado/concluído por Pedro
  - 02/10: Fase mudou para "RH/FINANCEIRO"
  - 06/10: Valor creditado na conta (R$ 8.789,85)
  - 07/10: Tarefa de arquivamento criada

---

### Frame 10: Timeline Final com Histórico de Fases
**Tempo:** 8:30 - 9:40  
**Sistema:** Advbox (case history)  
**Tabs:** Tarefas | Andamentos | **Intimações** | Financeiro

**História de eventos (timeline reversa - mais recente primeiro):**

#### Evento 1 (mais recente): Arquivamento Definitivo de Cliente
- **Tipo:** Task creation
- **Data/Hora:** 07/10/2026 (sem hora específica visível)
- **Status:** "Dados atualizados com sucesso. Clique aqui para gerar os documentos de..."
- **Botão:** (truncado)

#### Evento 2: Alteração de Fase
- **Tipo:** Phase change
- **Data/Hora:** 07/10/2026 17:21
- **Descrição:** "Alterou a etapa do processo"
- **Nova fase:** "Processo seguiu para fase: **Rh/financeiro/Depósito realizado**."
- **Status adicional:** "processo ganho" (case won)
- **Ator:** (não visível neste frame, mas anterior era Marcella)

#### Evento 3: Alteração de Fase
- **Tipo:** Phase change
- **Data/Hora:** 07/10/2026 17:21
- **Descrição:** "Alterou a etapa do processo"
- **Nova fase:** "Processo seguiu para fase: **Arquivamento/Arquivamento**"
- **Ator:** (não visível)

#### Evento 4: (parcialmente visível)
- Referência a "TASCORE 27 plt" (algum tipo de categoria?)

**Sequência de fases identificada:**
1. Status inicial (não mostrado explicitamente)
2. → "Rh/financeiro/Depósito realizado" (fase intermediária)
3. → "Arquivamento/Arquivamento" (fase de arquivamento)
4. → "ARQUIVAMENTO DEFINITIVO DE CLIENTE" (tarefa final)

**Insights críticos:**
- As fases têm nomes textuais com barras (/) como separadores
- O formato é: `{area}/{subfase}` ou `{fase}/{estágio}`
- Exemplos observados:
  - "Rh/financeiro/Depósito realizado"
  - "Arquivamento/Arquivamento"
- O padrão NÃO é um enum fixo - é texto livre

---

## 🎯 Gatilhos de Automação Identificados

### Gatilho 1: Identificação de Depósito em Conta
**Quando:** Um valor é creditado na conta corrente do escritório  
**Identificação:** Valor e data do crédito (no exemplo: R$ 8.789,85 em 06/10/2026)  
**Ação:** Iniciar busca do caso correspondente no Advbox pelo número de processo  
**Status na automação:** ⚠️ **Ainda não implementado**

### Gatilho 2: Movimento para "Rh/financeiro/Depósito realizado"
**Quando:** Caso é movido para a fase "Rh/financeiro/Depósito realizado"  
**Identificação:** Field `current_phase` contém "Rh/financeiro/Depósito realizado"  
**Ação:** Verificar se há transferência correspondente no Asaas (repasse ao cliente)  
**Status na automação:** ⚠️ **Parcialmente identificado (frame 10)**

### Gatilho 3: Transferência no Asaas (Repasse)
**Quando:** Uma transferência PIX/bancária é registrada no Asaas para o cliente  
**Identificação:** No Asaas, localizar transferência com:
  - Tipo: Transferência/PIX
  - Beneficiário: Cliente do caso (CPF/CNPJ match)
  - Valor: Compatível com valor líquido após honorários
  - Data: Próxima a data do crédito em conta
**Ação:** Disparar criação automática de tarefa "ARQUIVAMENTO DEFINITIVO DE CLIENTE"  
**Status na automação:** ⚠️ **Crítico - falta definir cross-reference field (Q6)**

---

## 📊 Cronologia Completa do Caso

```
Data         Hora    Evento                                      Sistema   Ator
─────────────────────────────────────────────────────────────────────────────
30/09/2026  14:37   Caso criado/concluído                        Advbox    Pedro
                    Status: Concluído
                    Fase: (não visível nos frames)

02/10/2026  15:49   Fase alterada para                            Advbox    Marcella
                    "Rh/financeiro" (implícito no frame 10)

06/10/2026  (?)     Valor creditado em conta                      (interno)  Banco
                    R$ 8.789,85 (valor bruto)
                    Honorários: R$ 3.073,81
                    Repasse futuro: R$ 5.716,04

07/10/2026  17:21   Fase alterada para                            Advbox    (?)
                    "Rh/financeiro/Depósito realizado"
                    Observação: "processo ganho"

07/10/2026  17:21   Fase alterada para                            Advbox    (?)
                    "Arquivamento/Arquivamento"

07/10/2026  (?)     Tarefa criada:                                Advbox    (?)
                    "ARQUIVAMENTO DEFINITIVO DE CLIENTE"
                    Protocolo com honorários preenchido
                    Status: Aguardando atribuição

(futuro)    (?)     Transferência ao cliente                      Asaas     (?)
                    R$ 5.716,04 (valor líquido)
                    Beneficiário: Maria Solange
```

---

## 🔍 Campos Críticos da API Advbox Confirmados

Com base na análise frame-by-frame, os seguintes campos foram identificados ou confirmados:

### Fields de Identificação
- `id` → ID do caso (e.g., 28231052)
- `lawsuit_id` → Pode ser diferente de `id`
- `client_name` → Nome do cliente (e.g., "Maria Solange de Carvalho")
- `client_cpf` → CPF do cliente
- `process_number` → Número do processo (pode ser com ou sem zeros iniciais)
- `process_number_cnj` → Número CNJ completo (e.g., "0052754-30.2026.8.04.1000")

### Fields de Status
- `status` → Status geral (e.g., "Concluído")
- `current_phase` → Fase atual (e.g., "Rh/financeiro/Depósito realizado")
  - ⚠️ **RESPOSTA À Q2:** Parece ser campo de TEXTO LIVRE, não enum
  - Valores observados: "Rh/financeiro", "Rh/financeiro/Depósito realizado", "Arquivamento/Arquivamento"
- `lawsuit_type` → Tipo de ação (e.g., "SEGURO PRESTAMISTA")
- `action_group` → Grupo de ação (e.g., "CONSUMIDOR")

### Fields de Datas
- `created_at` → Data de criação (e.g., "2026-09-30")
- `conclusion_date` → Data de conclusão (e.g., "2026-09-30")
- `modified_at` → Data de última modificação

### Fields de Atores
- `created_by` → ID do usuário que criou
- `responsible` → ID do usuário responsável
- (possivelmente `created_by_name` e `responsible_name`)

### Fields de Documentos
- `attachments[]` → Array de anexos
  - `name` → Nome do arquivo
  - `url` → Link para download
  - (possivelmente `type`, `size`, `uploaded_at`)

### Fields de Tarefas
- `tasks[]` → Array de tarefas/ações
  - `task_type` → Tipo de tarefa (e.g., "ARQUIVAMENTO DEFINITIVO DE CLIENTE")
  - `description` → Descrição da tarefa
  - `status` → Status da tarefa
  - (possivelmente `assigned_to`, `due_date`, `created_at`)

### Fields de Honorários
- `fees_percentage` → Percentual de honorários (e.g., 34.97)
- `fees_contractual_initial` → Honorários contratuais iniciais
- `fees_succumb` → Honorários sucumbenciais
- `fees_admin` → Honorários administrativos
- `fees_total` → Total de honorários
- (estrutura pode variar - precisa verificar na resposta real da API)

---

## ⚠️ Perguntas Ainda Sem Resposta Completa

### Q2: Nome Exato do Campo de Fase
**Pergunta original:** "No Advbox, qual é o NOME DO CAMPO na resposta da API que armazena o nome da fase atual?"

**Achados do vídeo:**
- Existe um campo que contém frases como:
  - "Rh/financeiro/Depósito realizado"
  - "Arquivamento/Arquivamento"
  - Formato: texto livre com barras (/) como separadores
  - **NÃO é um enum fechado**

**Hipóteses para nome do campo:**
- `current_phase`
- `fase_atual`
- `workflow_phase`
- `workflow_status`
- `process_stage`

**Necessário confirmar:** Qual é o NOME EXATO do field na resposta da API GET /lawsuits/{id}

---

### Q6: Campo Comum para Cross-Reference Advbox ↔ Asaas
**Pergunta original:** "Para a automação saber qual transferência no Asaas corresponde a qual case no Advbox, qual informação você usa?"

**Achados do vídeo:**
- Número de processo é a chave óbvia:
  - Advbox: "2754-30.2026.80.4.1000" (sem zeros iniciais?)
  - Asaas: Seria necessário ver como está armazenado
  - CNJ: "0052754-30.2026.8.04.1000" (formato completo)

**Possíveis estratégias identificadas:**
1. **Número de processo + Data + Valor**
   - Buscar no Asaas uma transferência para o cliente com valor ≈ repasse esperado
   - Data ≈ data de crédito em conta

2. **Buscar na descrição/observação**
   - Se o Asaas permite campo de "descrição" ou "referência"
   - Poderia conter o número do processo do Advbox

3. **CPF do cliente**
   - Cliente no Advbox tem CPF
   - Asaas tem CPF do beneficiário
   - Cruzar: Advbox client + Asaas beneficiary pelo CPF

**Necessário confirmar:**
- Como o caso é registrado no Asaas inicialmente?
- Qual campo específico pode ser usado como referência?
- Há um identificador único entre os dois sistemas?

---

## ✅ Checklist de Validação Pré-Automação

- [ ] Confirmar nome exato do field de fase na API Advbox (Q2)
- [ ] Confirmar como fazer cross-reference Advbox ↔ Asaas (Q6)
- [ ] Confirmar estrutura completa de resposta GET /lawsuits/{id}
- [ ] Confirmar estrutura de transferências no Asaas
- [ ] Confirmar endpoint para criar tarefas (Q3 já responde "consegue sim")
- [ ] Confirmar formato do protocolo de arquivamento (Q4 já responde "consegue sim")
- [ ] Confirmar se há contratos em Google Drive para todos os casos CONTRATUAL
- [ ] Confirmar critério de identificação: CONTRATUAL vs SUCUMBENCIAL
  - Response: "pela tarefa que o pedro envia ao anderson"
  - Interpretação: existe uma tarefa/ação que identifica o tipo?
- [ ] Confirmar se pode buscar valores de honorários nos campos da API
- [ ] Confirmar timing esperado entre cada etapa (Q7)
- [ ] Confirmar validações necessárias (Q8)
- [ ] Confirmar estrutura de dados esperada (Q9)

---

## 📈 Resumo: Pronto para Fase 3?

**Status:** ⚠️ **BLOQUEADO - Aguardando respostas finais**

**Desbloqueadores necessários:**
1. ✅ Entender estrutura básica do workflow (COMPLETO)
2. ❓ Confirmar Q2 - Nome do field de fase
3. ❓ Confirmar Q6 - Cross-reference Advbox ↔ Asaas
4. ❓ Responder Q7, Q8, Q9 - Fluxo temporal, validações, dados

**Próximo passo:** Reformular perguntas Q2 e Q6 de forma mais clara e direta, e solicitar respostas às perguntas Q7, Q8, Q9.
