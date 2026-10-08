# Validação da API Advbox - Documentação Oficial

**Data**: 2026-10-08  
**Fonte**: https://api.softwareadvbox.com.br/llms-full.txt  
**Status**: 3 questões críticas ainda precisam ser esclarecidas

---

## ✅ Confirmado na Documentação

### 1. Buscar Lawsuit por Número do Processo
**Endpoint correto:**
```
GET /lawsuits?process_number=NUMERO_CNJ
```

Exemplo:
```
GET /lawsuits?process_number=0052754-30.2026.8.04.1000
```

**Resposta**: Array de lawsuits (normalmente 1 match exato)

✅ **Código já ajustado em `advbox-client.ts`**

---

### 2. Criar Tarefa (Post)
**Endpoint correto:**
```
POST /posts
```

**Campos obrigatórios:**
- `from`: ID do usuário criador
- `guests`: array com IDs dos responsáveis (mínimo 1)
- `tasks_id`: tipo de tarefa (obtido em `GET /settings`)
- `lawsuits_id`: ID do processo
- `start_date`: formato `YYYY-MM-DD` ou `DD/MM/YYYY`

**Campos opcionais:**
- `start_time`
- `end_date`
- `end_time`
- `date_deadline`
- `local`
- `comments`
- `urgent` (boolean)
- `important` (boolean)
- `display_schedule`

✅ **Código já ajustado em `advbox-client.ts`**

---

### 3. Campos Disponíveis em um Lawsuit
**GET /lawsuits/{id} retorna:**

```json
{
  "id": "...",
  "process_number": "0052754-30.2026.8.04.1000",
  "protocol_number": "...",
  "folder": "...",
  "process_date": "...",
  "fees_expec": number,           // Fees esperadas
  "fees_money": number,           // Fees monetárias
  "contingency": boolean,
  "type_lawsuit_id": "...",       // Tipo do processo
  "type": "...",
  "group_id": "...",
  "group": "...",
  "created_at": "...",
  "status_closure": "...",
  "exit_production": "...",
  "exit_execution": "...",
  "responsible_id": "...",
  "responsible": "...",
  "stages_id": "...",
  "stage": "...",
  "steps_id": "...",
  "step": "...",
  "notes": "...",
  "customers": [
    {
      "customer_id": "...",
      "name": "...",
      "identification": "...",
      "origin": "..."
    }
  ]
}
```

---

## ⏳ Implementação Pronta - Aguardando User IDs

### Status de Implementação

✅ **CONCLUÍDO:**
- Detecção automática de tipo de case (sucumbencial vs contratual)
- Lógica baseada em comparação: `Valor alvará` vs `Honorários sucumbenciais`
- Método `createArchivingTask()` com estrutura completa do protocolo
- Configuração para User IDs e Task Type ID

❌ **BLOQUEADO - AGUARDANDO:**
- Valores numéricos dos User IDs (Priscila, Gabi, Anderson)
- Task Type ID para "ARQUIVAMENTO DEFINITIVO DE CLIENTE (1 pt)"

---

### Como Obter os IDs Faltantes

#### 1. User IDs (Priscila, Gabi, Anderson)

**Opção A: Pelo Advbox UI**
1. Acesse: `https://app.advbox.com.br`
2. Vá para: Configurações → Usuários / Gestão de Usuários
3. Localize cada usuário e anote o ID numérico
4. Copie os valores para o `.env`:
   ```
   ADVBOX_USER_ID_PRISCILA=<número>
   ADVBOX_USER_ID_GABI=<número>
   ADVBOX_USER_ID_ANDERSON=<número>
   ```

**Opção B: Pela API**
```bash
curl -X GET "https://app.advbox.com.br/api/v1/settings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```
Procure por `users` na resposta e encontre os IDs.

#### 2. Task Type ID para Arquivamento

**Pela API (GET /settings)**
```bash
curl -X GET "https://app.advbox.com.br/api/v1/settings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

Procure por `tasks_types` ou estrutura similar e localize:
- `"ARQUIVAMENTO DEFINITIVO DE CLIENTE (1 pt)"` 
- Copie o ID numérico para o `.env`:
  ```
  ADVBOX_TASK_TYPE_ID_ARQUIVAMENTO=<número>
  ```

---

### Detecção de Tipo de Case - Implementada ✅

**Arquivo:** `src/utils/case-type-detector.ts`

Detecta automaticamente:
- **SUCUMBENCIAL**: Quando `Valor álvará` = `Honorários sucumbenciais`
  - Exemplo: R$ 5.587,36 = R$ 5.587,36
- **CONTRATUAL**: Quando `Valor álvará` > `Honorários sucumbenciais`
  - Exemplo: R$ 16.460,61 > R$ 2.698,04
  - Diferença é dividida por percentual de repasse

**Função:**
```typescript
detectCaseType(alvaraValue: number, sucumbencialValue: number): CaseTypeDetectionResult
```

---

### Estrutura do Protocolo - Pronto ✅

O protocolo é construído automaticamente no campo `comments` de POST /posts:

```
PROTOCOLO DE ARQUIVAMENTO – OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS

**Honorários contratuais iniciais:** R$ X,XX
**Honorários sucumbenciais:** R$ X,XX
**Honorários contratuais de êxito:** R$ X,XX
**Valor total de honorários:** R$ X,XX
**Nota fiscal emitida:** (x) Sim

Não restam obrigações a serem cumpridas, estando todas integralmente satisfeitas.
Realizada a baixa e o arquivamento no ADVBOX.
```

---

## ✅ CONFIRMADO DO VÍDEO (2026-10-07)

### Task Type ID para Arquivamento
**Task Type encontrado na gravação:**
```
ARQUIVAMENTO DEFINITIVO DE CLIENTE (1 pt)
```
Este é o tipo de tarefa correto para criar a automação.

---

## 📋 Checklist para Próximos Passos

### Você (Priscila):
- [ ] Obter e copiar: ADVBOX_USER_ID_PRISCILA
- [ ] Obter e copiar: ADVBOX_USER_ID_GABI  
- [ ] Obter e copiar: ADVBOX_USER_ID_ANDERSON
- [ ] Obter e copiar: ADVBOX_TASK_TYPE_ID_ARQUIVAMENTO
- [ ] Enviar os 4 valores para atualização no `.env`

### Claude:
- [x] Validar endpoints da API ✅
- [x] Ajustar `advbox-client.ts` com endpoints corretos ✅
- [x] Implementar detecção de case type (sucumbencial vs contratual) ✅
- [x] Implementar `createArchivingTask()` com protocolo completo ✅
- [x] Preparar configuração para User IDs ✅
- [ ] **BLOQUEADO**: Receber User IDs de Priscila
- [ ] Atualizar `.env` com valores reais
- [ ] Testar criação de tarefas
- [ ] Testes unitários
- [ ] GitHub Actions workflow
- [ ] Deploy

---

## 🔗 Referências

- **Documentação oficial**: https://api.softwareadvbox.com.br/llms-full.txt
- **Documentação visual**: https://api.softwareadvbox.com.br/docs/referencia
- **Base URL**: `https://app.advbox.com.br/api/v1`
- **Autenticação**: Bearer token (via `ADVBOX_TOKEN` env var)

---

**Status**: 🟡 Implementação 80% pronta - aguardando 4 User IDs e Task Type ID do Advbox
