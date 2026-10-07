# Fluxo de Automação de Arquivamento - Visão Geral

## 📊 Diagrama de Fluxo (Casos Contraturais)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GATILHO: Valor Creditado em Conta                    │
│                                                                             │
│  WhatsApp/Email → Financeiro → "R$ X,XX creditado em conta"                │
│                                                                             │
│  ➜ Número de processo: 0052754-30.2026.8.04.1000                           │
│  ➜ Valor total: R$ 8.789,85                                                │
│  ➜ Honorários escritório: R$ 3.073,81 (35%)                                │
│  ➜ Valor cliente: R$ 5.716,04 (65%)                                        │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ETAPA 1: LOCALIZAR CASO NO ADVBOX                        │
│                                                                             │
│  Buscar: GET /lawsuits?process_number=0052754-30.2026.8.04.1000            │
│                                                                             │
│  ✓ Confirmar: case_id, responsible, status                                 │
│  ✓ Extrair: fee_percentage, fees_money                                      │
│  ✓ Validar: status = "Concluído"                                           │
│                                                                             │
│  ❌ Se não encontrar → FALHA: Notificar Gabi                               │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │ (Caso encontrado)
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ETAPA 2: VALIDAR TIPO DE CASO                             │
│                                                                             │
│  Confirmar: case_type = "CONTRATUAL"                                        │
│                                                                             │
│  ❌ Se SUCUMBENCIAL → PARAR (fora do escopo)                               │
│  ✓ Se CONTRATUAL → Prosseguir                                              │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  ETAPA 3: BUSCAR REPASSE NO ASAAS                           │
│                                                                             │
│  Buscar transferências (repasse):                                           │
│  GET /transfers?status=COMPLETED&reference=0052754-30.2026.8.04.1000       │
│                                                                             │
│  ✓ Confirmar: Valor ≈ R$ 5.716,04 (margem de erro: ±R$1)                 │
│  ✓ Extrair: transfer_date, transfer_id, recipient_name                     │
│  ✓ Validar: Destinatário é o cliente?                                      │
│                                                                             │
│  ❌ Se não encontrar → AGUARDAR (tentar novamente em 24h)                 │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │ (Repasse identificado)
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│            ETAPA 4: TRANSIÇÃO DE FASE NO ADVBOX (Arquivamento)             │
│                                                                             │
│  Mover case para fase: "Arquivamento/Arquivamento"                          │
│  PUT /lawsuits/{id}/phase → { phase: "Arquivamento/Arquivamento" }         │
│                                                                             │
│  Ou registrar atividade:                                                    │
│  POST /lawsuits/{id}/activities → { activity: "phase_change", ... }        │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│          ETAPA 5: CRIAR TAREFA "ARQUIVAMENTO DEFINITIVO DE CLIENTE"         │
│                                                                             │
│  POST /lawsuits/{id}/tasks                                                  │
│  {                                                                          │
│    "title": "ARQUIVAMENTO DEFINITIVO DE CLIENTE",                           │
│    "task_type": "ARCHIVING_FINAL",                                          │
│    "status": "COMPLETED",                                                   │
│    "protocol": {                                                            │
│      "honorarios_contratuais_iniciais": 0.00,                               │
│      "honorarios_sucumbenciais": 0.00,                                      │
│      "honorarios_contratuais_dano": 3073.81,                                │
│      "valor_total_honorarios": 3073.81,                                     │
│      "nota_fiscal_emitida": true                                            │
│    },                                                                       │
│    "comments": "Repasse identificado no Asaas em [data]. ..."              │
│  }                                                                          │
│                                                                             │
│  ✓ Tarefa criada com sucesso (score: 1 pts)                                 │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ETAPA 6: REGISTRAR PROTOCOLO FINAL                          │
│                                                                             │
│  POST /lawsuits/{id}/archiving-protocol                                     │
│  {                                                                          │
│    "case_id": "...",                                                        │
│    "archiving_date": "2026-10-07",                                          │
│    "protocol_number": "[Auto-gerado]",                                      │
│    "honorarios": 3073.81,                                                   │
│    "valor_cliente": 5716.04,                                                │
│    "asaas_transfer_id": "[ID da transferência]",                            │
│    "status": "ARQUIVADO",                                                   │
│    "observation": "Não restam obrigações. Arquivamento realizado com"       │
│                  "sucesso. Repasse confirmado no Asaas em [data]."         │
│  }                                                                          │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│            ETAPA 7: NOTIFICAR GABI (Tarefa Criada com Sucesso)             │
│                                                                             │
│  POST /tasks/create-for-user                                                │
│  {                                                                          │
│    "assigned_to": "gabi@calandrini.com.br",                                │
│    "title": "Caso Arquivado: Maria Solange vs Bradesco",                    │
│    "description": "Arquivamento automático concluído. Verifique dados",     │
│    "case_id": "...",                                                        │
│    "action_required": "REVIEW"                                              │
│  }                                                                          │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
                    ✅ CASO ARQUIVADO COM SUCESSO
                       Processo automático finalizado
```

---

## 🔄 Condições de Sucesso vs Falha

### ✅ Caminho Feliz (Happy Path)

```
Valor em conta
    ↓
Case encontrado (status: Concluído)
    ↓
Type: CONTRATUAL
    ↓
Repasse identificado no Asaas
    ↓
Tarefa criada
    ↓
Protocolo registrado
    ↓
✅ ARQUIVADO
```

### ❌ Caminhos de Falha e Recuperação

```
┌─ FALHA 1: Caso não encontrado
│  ➜ Ação: Notificar Gabi com número do processo
│  ➜ Status: Manual - Aguardando investigação
│  ➜ Retry: 24 horas depois
│
├─ FALHA 2: Case não está "Concluído"
│  ➜ Ação: Aguardar finalização
│  ➜ Status: Pendente - Voltar a verificar amanhã
│  ➜ Retry: 24 horas depois
│
├─ FALHA 3: Type = SUCUMBENCIAL
│  ➜ Ação: Parar automação (caso não se aplica)
│  ➜ Status: Fora do escopo - Notificar financeiro
│  ➜ Retry: Nunca (escopo diferentes)
│
├─ FALHA 4: Repasse não identificado no Asaas
│  ➜ Ação: Aguardar transferência
│  ➜ Status: Pendente - Voltar a verificar amanhã
│  ➜ Retry: 24 horas depois
│
└─ FALHA 5: Erro na criação de tarefa/protocolo
   ➜ Ação: Registrar erro em log
   ➜ Status: Erro - Notificar DevOps
   ➜ Retry: Manual (investigar causa raiz)
```

---

## 📊 Dados Necessários

### Da Comunicação Inicial (WhatsApp/Email)
```
✓ Número de processo (CNJ)
✓ Nome do cliente
✓ Valor creditado em conta
✓ Honorários do escritório
✓ Valor para repasse ao cliente
```

### Do Advbox (GET /lawsuits)
```
✓ case_id
✓ process_number
✓ responsible (cliente)
✓ status
✓ case_type (CONTRATUAL vs SUCUMBENCIAL)
✓ fee_percentage
✓ fees_money
✓ current_phase
```

### Do Asaas (GET /transfers)
```
✓ transfer_id
✓ amount
✓ date
✓ recipient_name
✓ status (COMPLETED)
✓ reference_number (process_number)
```

### Gerados pela Automação
```
✓ archiving_date
✓ protocol_number
✓ task_id
✓ archiving_status (ARQUIVADO)
✓ completion_timestamp
```

---

## ⏱️ Timing e Retry Strategy

| Etapa | Timeout | Retry | Condição |
|-------|---------|-------|----------|
| Buscar case | 5s | 3x | Se timeout ou não encontrado |
| Buscar repasse | 10s | 3x | Se timeout |
| Criar tarefa | 5s | 2x | Se erro (será retentado) |
| Registrar protocolo | 5s | 2x | Se erro (será retentado) |
| Notificar Gabi | 5s | 2x | Se erro (já foi registrado) |

**Total máximo em caso de sucesso**: ~25 segundos
**Intervalo entre retries**: 24 horas (para aguardar dados)

---

## 📋 Checklist Pré-Automação

Antes de rodar automaticamente, validar:

- [ ] **Q1 Respondida**: Como distinguir CONTRATUAL?
- [ ] **Q2 Respondida**: Nome exato da fase?
- [ ] **Q3 Respondida**: Endpoint de tarefas?
- [ ] **Q4 Respondida**: Como registrar protocolo?
- [ ] **Q5 Respondida**: O que é "repasse"?
- [ ] **Q6 Respondida**: Campo de cross-reference?
- [ ] **Q7 Respondida**: Estado exato do case?
- [ ] **Q8 Respondida**: Validações obrigatórias?
- [ ] **Q9 Respondida**: Estrutura de dados?

**Depois responder estas perguntas, prosseguir para implementação.**

