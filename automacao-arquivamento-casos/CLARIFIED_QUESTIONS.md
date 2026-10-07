# Perguntas Reformuladas - Com Base na Análise do Vídeo

Com base na análise detalhada do vídeo de demonstração, aqui estão as perguntas reformuladas e as novas perguntas que surgiram.

---

## Perguntas Respondidas ✅

### Q1: Como distinguir CONTRATUAL de SUCUMBENCIAL?
**Status:** ✅ RESPONDIDA  
**Sua resposta:** "pela tarefa que o pedro envia ao anderson"  

**Interpretação:** Pedro (jurídico) envia uma tarefa/ação para Anderson que identifica o tipo de caso (se é CONTRATUAL ou SUCUMBENCIAL).

**Confirmado no vídeo:**
- O caso é identificado como CONTRATUAL pela existência de um contrato de prestação de serviços no Google Drive
- Arquivo: "85 Maria Solange - SEGURO final 283.pdf.pdf"
- Documento: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS E HONORÁRIOS ADVOCATÍCIOS"

---

### Q3: Advbox consegue criar tarefas?
**Status:** ✅ RESPONDIDA  
**Sua resposta:** "consegue sim"

**Confirmado no vídeo:**
- Tarefa criada: "ARQUIVAMENTO DEFINITIVO DE CLIENTE (1 pts)"
- Protocolo estruturado adicionado à tarefa
- Botão "Atribuir tarefa" visível

---

### Q4: Advbox consegue registrar protocolo?
**Status:** ✅ RESPONDIDA  
**Sua resposta:** "consegue sim"

**Confirmado no vídeo:**
- Protocolo capturado em Frame 9:
  ```
  PROTOCOLO DE ARQUIVAMENTO - OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS
  - Honorários contratuais iniciais: R$ 0,00
  - Honorários sucumbenciais: R$ 0,00
  - Honorários contratuais de Adm: R$ 3.073,81
  - Valor total de honorários: R$ 3.073,81
  - Nota fiscal emitida: () Sim () Não
  - Observação: "Não restam obrigações..."
  ```

---

### Q5: O que é "repasse" no Asaas?
**Status:** ✅ RESPONDIDA  
**Sua resposta:** "é a transferencia ao cliente em si. identificando a saida pix, transferencia no asaas"

**Confirmado no vídeo:**
- Valor creditado em conta (Advbox/escritório): R$ 8.789,85 (06/10/2026)
- Honorários do escritório: R$ 3.073,81
- **Repasse ao cliente = Valor de transferência PIX no Asaas: R$ 5.716,04**
- Beneficiário: Maria Solange de Carvalho

---

## Perguntas Reformuladas 🔄

### Q2 (REFORMULADA): Nome do Campo de Fase no Advbox

**Pergunta anterior (não entendida):**
> "Qual é o nome exato da fase que aparece no vídeo como 'Rh/Financeiro/Depósito realizado' na resposta da API?"

**Nova pergunta (mais clara):**

Quando você faz uma requisição GET para a API Advbox para obter os dados de um caso, qual é o **NOME DO CAMPO** que contém a fase/estágio atual do caso?

Por exemplo, se você chama:
```
GET /lawsuits/28231052
```

Na resposta JSON, em qual campo está armazenada a informação sobre a fase atual? É:
- `status` ?
- `current_phase` ?
- `fase_atual` ?
- `workflow_phase` ?
- `stage` ?
- Outro nome?

**Exemplo esperado:**
```json
{
  "id": 28231052,
  "client_name": "Maria Solange de Carvalho",
  "[QUAL_É_ESTE_FIELD?]": "Rh/financeiro/Depósito realizado",
  ...
}
```

**Por que preciso:** Preciso saber qual campo monitorar para detectar quando um caso muda de fase (especialmente quando chega em "Rh/financeiro/Depósito realizado" ou "Arquivamento/Arquivamento").

---

### Q6 (REFORMULADA): Cross-Reference entre Advbox e Asaas

**Pergunta anterior (não entendida):**
> "Campo comum entre Advbox e Asaas para identificar transferências?"

**Nova pergunta (mais clara):**

No Asaas, quando você registra uma transferência PIX/bancária para um cliente (o "repasse"), como você identifica a qual caso do Advbox essa transferência pertence?

Qual informação você usa para "casar" os dados entre os dois sistemas?

**Opções possíveis (qual é a sua?):**

1. **Número do processo**
   - Você armazena o número do processo (ex: "0052754-30.2026.8.04.1000") em algum campo do Asaas?
   - Se sim, em qual campo? (description, reference, custom_field, memo?)

2. **CPF do cliente**
   - Você busca por CPF do cliente no Advbox e CPF do beneficiário no Asaas?
   - Se sim, eles sempre batem?

3. **Nome do cliente + Valor + Data**
   - Você faz uma busca combinando nome, valor aproximado e data?

4. **ID do caso do Advbox armazenado no Asaas**
   - Você salva o ID do caso Advbox (ex: 28231052) em algum lugar do Asaas?

5. **Outro método?**
   - Existe uma integração API entre Asaas e Advbox que você já tem ativa?

**Exemplo do que preciso saber:**
```
Caso Advbox:
- ID: 28231052
- Cliente: Maria Solange de Carvalho
- CPF: 474.795.312-49
- Número processo: 0052754-30.2026.8.04.1000

Transferência Asaas:
- Beneficiário: Maria Solange de Carvalho
- Beneficiário CPF: 474.795.312-49
- Valor: R$ 5.716,04
- Data: 06/10/2026 ou posterior
- Descrição/Referência: ??? (contém número do processo?)

Como conectar esses dois dados?
```

**Por que preciso:** A automação precisa localizar a transferência correspondente no Asaas para saber quando disparar a tarefa de arquivamento. Sem saber como casar os dados, não consigo buscar a transferência correta.

---

## Perguntas Novas (Ainda Sem Resposta) 📋

### Q7: Cronologia e Timing das Etapas

**Pergunta:**

Qual é a sequência esperada de **timing** entre os eventos? Especificamente:

1. **Quando Pedro marca o caso como "Concluído" no Advbox**, quanto tempo depois...
2. ...o **valor é creditado na conta do escritório**?
3. ...quando o valor é creditado, é esperado que **a fase mude para "Rh/financeiro" ou "Rh/financeiro/Depósito realizado"** automaticamente ou também é feito manualmente?
4. Quando a fase está em **"Rh/financeiro/Depósito realizado"**, quanto tempo depois a **transferência (repasse) é feita no Asaas**?
5. Quando a **transferência é registrada no Asaas**, a **tarefa de arquivamento deve ser criada imediatamente** ou há mais alguma etapa manual?

**Contexto do vídeo:**
```
- 30/09: Caso criado/concluído por Pedro
- 02/10: Fase alterada para "Rh/financeiro" (possivelmente)
- 06/10: Valor creditado em conta (R$ 8.789,85)
- 07/10 17:21: Fase alterada para "Rh/financeiro/Depósito realizado"
- 07/10: Tarefa de arquivamento criada
```

**Por que preciso:** Para saber se a automação deve rodar:
- A cada hora?
- Uma vez por dia?
- Baseada em webhooks/eventos?

---

### Q8: Validações e Condições para Arquivamento

**Pergunta:**

Quais são as **condições que precisam ser satisfeitas** antes de criar automaticamente a tarefa "ARQUIVAMENTO DEFINITIVO DE CLIENTE"?

Checklist de validações:

- [ ] Caso deve estar com `status = "Concluído"`?
- [ ] Fase deve estar em `"Rh/financeiro/Depósito realizado"`?
- [ ] Deve haver um valor creditado na conta do escritório?
- [ ] Deve existir uma transferência correspondente no Asaas?
- [ ] O cliente deve ter um contrato (confirmar se é CONTRATUAL)?
- [ ] Deve haver confirmação de que as obrigações foram cumpridas?
- [ ] Alguma outra validação?

**Por que preciso:** Para saber que validações implementar no código e quando disparar o alerta se algo estiver errado.

---

### Q9: Estrutura de Dados Esperada no Protocolo

**Pergunta:**

Qual é a **estrutura exata de dados que deve ir no protocolo de arquivamento**?

No vídeo vi:
```
PROTOCOLO DE ARQUIVAMENTO - OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS

**Honorários contratuais iniciais:** R$ 0,00
**Honorários sucumbenciais:** R$ 0,00
**Honorários contratuais de Adm:** R$ 3.073,81
**Valor total de honorários:** R$ 3.073,81
**Nota fiscal emitida:** () Sim () Não
**Observação:** "Não restam obrigações a serem cumpridas, estando todas 
integralmente satisfeitas. Realizada a baixa e o arquivamento no ADVBOX."
```

Questões sobre a estrutura:

1. **De onde vêm os valores de honorários?**
   - `fees_contractual_initial` vem do contrato?
   - `fees_succumb` vem de tarefas/ações?
   - `fees_admin` é calculado automaticamente? (34.97% do valor creditado?)
   - Como saber se algum desses é R$ 0,00 vs. algum valor real?

2. **Como preencher "Nota fiscal emitida"?**
   - Deve confirmar automaticamente como "Sim" ou deixar em branco?
   - Quem confirma isso? (Anderson? Accountant?)

3. **O texto da Observação é fixo ou varia?**
   - O texto "Não restam obrigações..." é sempre o mesmo?
   - Ou pode mudar dependendo do caso?

4. **Há outros campos no protocolo além desses?**
   - Valor total repassado ao cliente?
   - Data de transferência?
   - Número do processo?

5. **Qual é o **título do protocolo**? É sempre:**
   - "PROTOCOLO DE ARQUIVAMENTO - OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS"?
   - Ou pode variar?

**Por que preciso:** Para montar corretamente o objeto que será enviado à API do Advbox para criar a tarefa com o protocolo.

---

## 📝 Próximos Passos

Por favor responda:

1. **Q2 reformulada** - Qual é o nome exato do field de fase?
2. **Q6 reformulada** - Como fazer cross-reference Advbox ↔ Asaas?
3. **Q7** - Cronologia e timing das etapas?
4. **Q8** - Validações necessárias?
5. **Q9** - Estrutura de dados do protocolo?

Essas respostas desbloqueiam a implementação completa da automação (Fase 3).

