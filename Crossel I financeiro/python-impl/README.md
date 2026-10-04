# Crossel I - Automação de Triagem Financeira (Advbox)

Sistema de automação integrado para triagem de casos "sem oportunidade" do Advbox, com verificações complementares de documentação e histórico de atendimento.

---

## 📋 Visão Geral

Este projeto contém:

1. **Workflow GitHub Actions** (`revisar_workflow.yml`) — Executa diariamente a triagem automática
2. **Script Python** (`revisar_sem_oportunidade.py`) — Conecta à Advbox API, busca contracheques no Google Drive e classifica casos
3. **Skills Cowork** — Verificações manuais complementares para casos "sem oportunidade"

---

## 🔄 Fluxo do Processo

```
[Jurídico Protocola no Advbox]
           ↓
[Workflow GitHub Actions - 2x/dia]
           ↓
[Script Python Analisa Posts]
           ↓
    ┌─────┴─────┐
    ↓           ↓
[Tem Demanda] [Sem Oportunidade]
    ↓           ↓
[Encaminha]   [Verifica Manualmente]
[Comercial]         ↓
              ┌─────┴──────┐
              ↓            ↓
         [Skill 1]    [Skill 2]
         [Contracheque] [SAC/SellFlux]
              ↓            ↓
         [Encontrou?]  [Encontrou?]
         SIM/NÃO        SIM/NÃO
              ↓            ↓
         [Conclusão]  [Conclusão]
```

---

## 🤖 Workflow Automático

**Arquivo:** `revisar_workflow.yml`

### O que faz:
- Executa **diariamente às 13h UTC** (09h horário de Cuiabá)
- Busca posts do Advbox classificados como "sem_oportunidade"
- Para cada post:
  - Extrai nome do cliente
  - Busca pasta no Google Drive
  - Encontra e lê contracheque em PDF
  - Detecta sinais de empréstimo/consignado
  - Se encontrar: adiciona comentário, atribui ao comercial, marca como concluído
  - Se não encontrar: marca como concluído

### Credenciais Necessárias (GitHub Secrets):
- `ADVBOX_TOKEN` — Token Bearer da API Advbox
- `GOOGLE_CREDS_BASE64` — Credenciais Google Drive em base64
- `SMTP_USER` — Email SMTP para notificações
- `SMTP_PASS` — Senha SMTP
- `EMAIL_DESTINO` — Email para relatórios de erro

### Saída:
- Arquivo `results/review_results.json` com resultados processados
- Notificação por email em caso de erro

---

## 🐍 Script Python

**Arquivo:** `revisar_sem_oportunidade.py`

### Classe: `AdvboxReviewer`

Método principal: `run()`

#### Fluxo por post:
1. `get_sem_oportunidade_posts()` — Busca posts na API Advbox
2. Para cada post:
   - `extract_client_name()` — Extrai nome do cliente
   - `find_client_folder()` — Busca pasta no Google Drive
   - `find_payroll_file()` — Localiza contracheque (prioriza "atual")
   - `download_and_read_pdf()` — Baixa e lê PDF
   - `detect_loans()` — Procura padrões de empréstimo
   - `process_post()` — Toma ação conforme resultado

#### Padrões de Empréstimo Detectados:
```python
LOAN_PATTERNS = [
    r'EMPRÉSTIMO',
    r'BIB\s+EMP',
    r'BIB-EMPRESTIMO',
    r'MEIO\s+PGTO\s+CARTAO',
    r'(\d+)/(\d+)',  # Padrão "NN/96" de parcelas
]
```

#### Rodízio Comercial:
- Fabio Marcello Vilanova de Abreu Filho
- Leticia Carvalho

---

## 🛠️ Skills Cowork (Verificações Manuais)

Quando o workflow automático marca um post como "sem oportunidade", Priscila pode fazer verificações manuais complementares usando estas skills:

### **Skill 1: `revisar-sem-oportunidade-advbox`**

**Quando usar:** Após o workflow automático, para revisar manualmente

**O que verifica:**
- Contracheque do cliente no Google Drive
- Sinais de empréstimo/consignado que possam ter sido perdidos

**Passos:**
1. Extrair nome completo do cliente (Partes envolvidas no Advbox)
2. Buscar pasta no Google Drive (`00 CLIENTES`)
3. Navegar até a pasta do contracheque (segue padrão: `CADEIRA | <matrícula>`)
4. Listar e localizar "Contracheque atual.pdf"
5. Ler PDF e procurar em "DESCRIÇÃO":
   - `EMPRÉSTIMO`, `BIB EMP`, `BIB-EMPRESTIMO`
   - `MEIO PGTO CARTAO`
   - Padrão `NN/96` (parcelas em aberto)
6. Se encontrar:
   - Adicionar comentário: "Possível demanda no contracheque"
   - Anexar PDF
   - Atribuir ao comercial (rodízio)
   - Marcar concluído
7. Se não encontrar:
   - Marcar concluído

**Ferramentas usadas:**
- Google Drive (search_files, download_file_content)
- Claude in Chrome (comentários/atribuição no Advbox)

---

### **Skill 2: `verificar-cliente-sac-sellflux`**

**Quando usar:** Complementar à Skill 1 (verifica histórico de atendimento)

**O que verifica:**
- Histórico de notas no SAC (SellFlux)
- Demandas mencionadas mas não tratadas
- Sinalizações de outros setores

**Passos:**
1. Extrair número do cliente (sem traços/formatação)
2. Acessar SellFlux → Seção Chats
3. Pesquisar cliente pelo número
4. Abrir TODAS as notas (ajustar para máximo se limitado)
5. Analisar por cor:
   - 🟨 **Amarela** = Atendimento Inicial (sinalizações)
   - 🟩 **Verde** = Comercial (propostas/fechamento)
   - 🟥 **Vermelha** = Documentação
   - 🟦 **Azul** = Outros setores
6. Se encontrar demanda não tratada:
   - Criar nota/tarefa no SAC
   - Descrever demanda
   - Atribuir responsável
7. Registrar conclusão no Advbox

**Ferramentas usadas:**
- SellFlux (SAC)
- Advbox (comentários)

---

## 🔗 Integração Entre Skills

As duas skills são **complementares e independentes:**

| Aspecto | Skill 1 (Contracheque) | Skill 2 (SAC) |
|--------|----------------------|--------------|
| **Verifica** | Documentação | Histórico |
| **Onde busca** | Google Drive | SellFlux |
| **Procura por** | Empréstimos/descontos | Demandas mencionadas |
| **Ferramenta principal** | Google Drive API | SellFlux UI |
| **Quando usar** | Sempre (1º) | Depois de Skill 1 |

**Recomendação:** Use ambas para validação completa antes de fechar caso como "sem oportunidade".

---

## 📊 Resultados

O workflow gera arquivo `results/review_results.json`:

```json
[
  {
    "post_id": "123456",
    "client_name": "Michele Amorim da Rocha",
    "status": "completed",
    "message": "Sem demanda detectada. Marcado como concluído."
  },
  {
    "post_id": "123457",
    "client_name": "João Silva",
    "status": "assigned_to_commercial",
    "message": "Demanda detectada e encaminhada para fabio@example.com"
  }
]
```

### Status possíveis:
- `completed` — Sem demanda, concluído
- `assigned_to_commercial` — Demanda encontrada, encaminhada
- `partial_success` — Encaminhado mas com erro parcial
- `error` — Erro ao processar

---

## 🚀 Como Rodar Localmente

### Pré-requisitos:
```bash
python 3.11+
pip install requests PyPDF2 google-cloud-drive google-auth-httplib2 google-auth-oauthlib
```

### Executar:
```bash
export ADVBOX_API_TOKEN="seu_token_aqui"
export ADVBOX_API_URL="https://api.advbox.com.br/api"
export GOOGLE_CREDS_JSON="caminho/para/credentials.json"

python revisar_sem_oportunidade.py
```

---

## 📝 Observações

- O workflow roda **2x por dia** (horário UTC)
- Resultados são commitados automaticamente no repo
- Erros geram email de notificação
- Recomenda-se revisar manualmente posts "sem_oportunidade" usando as skills para validação
- Contracheques de SEDUC (Amazonas) seguem layout padrão com tabela de proventos/descontos

---

## 🔐 Segurança

- Credenciais armazenadas em GitHub Secrets
- Google Credentials codificadas em base64 (decodificadas em runtime)
- Token Advbox nunca é exposto em logs
- Resultados não contêm dados sensíveis

---

## 📞 Suporte

Para dúvidas sobre as skills:
- **Skill 1**: Verificação de contracheque → revisar-sem-oportunidade-advbox
- **Skill 2**: Verificação de SAC → verificar-cliente-sac-sellflux

Para dúvidas sobre automação:
- Verifique logs do workflow em GitHub Actions
- Consulte arquivo de resultados em `results/review_results.json`
