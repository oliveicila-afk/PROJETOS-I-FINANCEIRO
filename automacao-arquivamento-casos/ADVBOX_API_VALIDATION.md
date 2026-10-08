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

## ❌ Não Encontrado na Documentação

### Questão 1: Qual Campo Diferencia Sucumbencial de Contratual?

**O que a documentação diz:**
> "A documentação não informa um campo específico para diferenciar honorários sucumbenciais de contratuais. Os campos financeiros disponíveis são `fees_expec`, `fees_money` e `contingency`, mas nenhum deles é descrito dessa forma."

**Possibilidades:**
1. Campo customizado não documentado
2. Diferença em `type_lawsuit_id` ou `type`
3. Informação em algum campo de notas/comments
4. Está em um enum de tipos de processo que não foi documentado

**Você precisa responder:**
- Qual é o campo ou a forma como você diferencia sucumbencial de contratual atualmente?
- Está em `type_lawsuit_id`? Há um ID específico?
- Ou você extrai essa informação de outro lugar (contrato em Google Drive, por exemplo)?

---

### Questão 2: User ID para Criar Tarefa

**O endpoint POST /posts requer:**
```
"from": ID do usuário criador
"guests": [ID do responsável]
```

**Você precisa responder:**
- Qual é o user ID que deve criar a tarefa automaticamente?
- Qual é o user ID de Gabi (responsável por arquivamento)?
- Onde obter o `tasks_id` (tipo de tarefa)? Preciso chamar GET /settings?

---

### Questão 3: Estrutura do Protocolo na Tarefa

**Na documentação de POST /posts:**
- Campo `comments` pode receber a descrição/protocolo
- Não há campo específico para "protocol_data" como implementei

**Você precisa responder:**
- O protocolo de arquivamento deve ir em `comments`?
- Há um formato esperado para o protocolo?
- Ou precisa ser em um campo customizado do Advbox?

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
- [ ] Responder: Qual campo diferencia sucumbencial de contratual?
- [ ] Responder: Qual é o user ID para criar tarefas?
- [ ] Responder: Qual é o user ID de Gabi?
- [ ] Responder: Como estruturar o protocolo na tarefa?

### Claude:
- [x] Validar endpoints da API ✅
- [x] Ajustar `advbox-client.ts` com endpoints corretos ✅
- [ ] Após respostas: Ajustar lógica de determinação de case type
- [ ] Após respostas: Ajustar payload de criação de tarefa
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

**Status**: 🟢 Endpoints validados, 3 questões críticas pendentes de resposta
