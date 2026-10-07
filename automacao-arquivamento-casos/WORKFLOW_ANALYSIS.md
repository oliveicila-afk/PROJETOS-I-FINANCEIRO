# Análise do Workflow de Arquivamento de Casos Contraturais

## 📹 Análise dos Frames de Vídeo

### Visão Geral
O vídeo demonstra o fluxo de arquivamento de um caso **CONTRATUAL** (Maria Solange de Carvalho vs Banco Bradesco S/A, processo 0052754-30.2026.8.04.1000). 

### Sequência de Etapas Visualizadas

#### 1️⃣ **Comunicação Inicial (Frame 1 - WhatsApp)**
Informativo do caso enviado no grupo "FINANCEIRO CALANDRINI ADVOCACIA" contendo:
- **Caso**: Sucumbencial Rejane Souza de Carvalho
- **Cliente (Responsável)**: Maria Solange de Carvalho
- **Número de autos**: 0052754-30.2026.8.04.1000
- **Valor creditado em conta do escritório**: R$ 8.789,85
- **Honorários (% do escritório)**: R$ 3.073,81
- **Valor líquido a enviar ao cliente**: R$ 5.716,04

**Análise**: Este é o gatilho inicial - o financeiro notifica que recebeu o valor em conta.

#### 2️⃣ **Busca no Advbox (Frame 2)**
- Pesquisa por número de processo: `2754-30.2026.80.4.1000`
- Sistema encontra referência (mostra "577")
- Resultado: Caso localizado no sistema

#### 3️⃣ **Documentação Judicial (Frame 3)**
- Sentença PDF: "SENTENÇA MARIA SOLANGE.5217.pdf"
- Polo Passivo: BANCO BRADESCO S/A
- Contém decisão/conclusão do caso

#### 4️⃣ **Detalhes do Processo no Advbox (Frame 4)**
- **Situação**: Concluído
- **Data do evento**: Específica (da conclusão)
- **Anexos**:
  - ALVARÁ MARCIA SOLANGE_1584.pdf
  - SENTENÇA MARIA SOLANGE_5217.pdf
  - ACORDÃO MARIA SOLANGE_5841.pdf
- **Criado por**: Pedro Igor Farias Rodrigues (data: 30/09/2026, 14:37)

**Análise**: Caso já está em estado "Concluído" no Advbox

#### 5️⃣ **Contrato de Serviços (Frame 5 - Google Drive)**
Documento: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS E HONORÁRIOS ADVOCATÍCIOS"
- **Contratado (Advogado)**: THIAGO CALANDRINI SOCIEDADE INDIVIDUAL DE ADVOCACIA
- **Contratante (Cliente)**: Maria Solange de Carvalho
- **Objetivo**: Contrato de prestação de serviços jurídicos

**Análise**: Confirma que é caso CONTRATUAL (não sucumbencial)

#### 6️⃣ **Referência ao Processo Judicial (Frame 6 - ProcJud)**
Sistema online ProcJud mostrando:
- **Processo**: 0052754-30.2026.8.04.1000
- **Classe**: 156 - Cumprimento de Sentença
- **Requerente**: Maria Solange de Carvalho
- **Requerido**: BANCO BRADESCO S/A
- **Valor da Causa**: R$ 14.283,74

**Análise**: Cross-reference com sistema judicial externo

#### 7️⃣ **Modal de Ação do Processo (Frame 7 - Advbox)**
Campos exibidos:
- Partes envolvidas (dropdown com "MARIA SOLANGE DE CARVALHO")
- Campo de ações ("Adostar outra parte")
- Tipo de ação ("SEGURO PRESTAMISTA")
- Número do processo (CNJ): 0052754-30.2026.8.04.1000
- Botão: "Analisar dados do processo"

**Análise**: Interface para registrar dados do processo no Advbox

#### 8️⃣ **Timeline com Fases de Processamento (Frame 8)**
Abas: **Tarefas | Andamentos | Intimações | Financeiro**

Detalhes visíveis:
- **TASCORE**: 27 pts
- **Filtro**: "Todas as atividades"
- **Evento 1** (07/10/2026, 18:21):
  - "Albergui a etapa do processo"
  - Processo seguiu para fase: **Arquivamento/Arquivamento**
- **Evento 2** (07/10/2026, 17:21):
  - "Albergui a etapa do processo"
  - Processo seguiu para fase: **Rh/Financeiro/Depósito realizado**
- **Última Ação**: 🔴 "Arquivamento Definitivo de Cliente"

**Análise**: Aqui vemos as fases do workflow:
1. Primeiro vai para Rh/Financeiro/Depósito realizado (quando valor cai em conta)
2. Depois vai para Arquivamento/Arquivamento
3. Finaliza em "Arquivamento Definitivo de Cliente"

#### 9️⃣ **Comentário e Tarefa de Arquivamento (Frame 9)**
Situação: **Concluído** ⭐ IMPORTANTE | URGENTE

Data do evento: 02/10/2026 (em vermelho)

Tarefa: **ARQUIVAMENTO DEFINITIVO DE CLIENTE (1 pts)**

Protocolo de Arquivamento - Obrigações Integralmente Cumpridas:
```
"**Honorários contratuais iniciais**: R$ 0,00
**Honorários sucumbenciais**: R$ 0,00
**Honorários contratuais de Dano**: R$ 3.073,81
**Valor total de honorários**: R$ 3.073,81
**Nota fiscal emitida**: (x) Sim () Não

**Segue em anexo:**
(x) contrato
(x) comprovante de envio ao cliente
(x) Nota fiscal emitida
```

Observação: "Não restam obrigações a serem cumpridas, estando todas integralmente satisfeitas. Realizada a baixa e o arquivamento no ADVBOX."

**Análise**: Aqui está o protocolo final que confirma:
- Todos os honorários foram recebidos
- Cliente foi pagado
- Nota fiscal foi emitida
- Caso pode ser arquivado

#### 🔟 **Histórico Final com Timeline (Frame 10)**
Abas: **Tarefas | Andamentos | Intimações | Financeiro**

Timeline mostrando:
- Processo passou por várias etapas
- Visualiza-se entrada em "Rh/Financeiro"
- Mostra estado final com arquivamento

## 🔄 Fluxo de Automação (CONTRATUAL)

### Gatilhos Identificados

**Gatilho 1: Movimento para Rh/Financeiro**
- Quando valor é creditado em conta
- Identifica por número de processo
- Busca cliente exato no Advbox (mesmo número de processo)
- **Status no Advbox**: Passa para fase "Rh/Financeiro/Depósito realizado"

**Gatilho 2: Identificação de Repasse no Asaas**
- Após confirmar que valor foi creditado EM CONTA
- Buscar no Asaas: transferência (repasse) para o cliente
- Quando repasse é encontrado → **Pode arquivar**

**Gatilho 3: Arquivamento Definitivo**
- Quando repasse no Asaas é identificado
- Cria tarefa "ARQUIVAMENTO DEFINITIVO DE CLIENTE"
- Registra protocolo com honorários
- Move para fase final "Arquivamento/Arquivamento"

### Campos Críticos Identificados

**No Advbox:**
- `process_number` (CNJ): Identifica o caso (ex: 0052754-30.2026.8.04.1000)
- `responsible`: Cliente (ex: Maria Solange de Carvalho)
- `status`: Deve estar "Concluído"
- `fee_percentage`: Percentual de honorários
- Fase/Status do caso: Rh/Financeiro/Depósito realizado
- Tipo de ação: Identifica se é CONTRATUAL vs SUCUMBENCIAL

**No Asaas:**
- Transferência (repasse) para cliente
- Número de processo como referência
- Data de transferência
- Valor transferido

**Fluxo de Valores (Contratual):**
1. Valor total em conta: R$ 8.789,85
2. Honorários (% escritório): R$ 3.073,81 (35%)
3. Valor para repasse ao cliente: R$ 5.716,04 (65%)

## 📋 Checklist de Validação

Antes de arquivar automaticamente:
- [ ] Processo existe no Advbox
- [ ] Status é "Concluído"
- [ ] É caso CONTRATUAL (não sucumbencial)
- [ ] Valor foi creditado em conta do escritório
- [ ] Cliente pode ser identificado pelo mesmo número de processo
- [ ] Repasse foi identificado no Asaas
- [ ] Honorários correspondem ao registrado
- [ ] Todos os documentos foram anexados
- [ ] Nota fiscal foi emitida

## 🔗 Próximos Passos

1. Identificar exatamente como Advbox marca a fase "Rh/Financeiro/Depósito realizado"
   - É um campo status?
   - É uma etapa/milestone?
   - Como chamamos na API?

2. Confirmar se "repasse" no Asaas é uma transferência sainte (para cliente) ou entrante

3. Identificar campos da API para:
   - Marcar como "Arquivamento Definitivo de Cliente"
   - Registrar protocolo/comentário
   - Mover para fase "Arquivamento/Arquivamento"

4. Implementar cross-reference entre:
   - Advbox case_id → Asaas transfer identificado por process_number

