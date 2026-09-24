# Integração AdvBox - Guia Completo

Este documento descreve como usar a integração nativa do Crossell com a API do AdvBox para revisar demandas, verificar agendas e atribuir clientes automaticamente.

## 🚀 Configuração Inicial

### 1. Preparar as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preencha com suas credenciais:

```bash
ADVBOX_API_URL=https://app.advbox.com.br/api/v1
ADVBOX_TOKEN=seu_token_do_github_secrets_aqui
```

### 2. Instalar e compilar

```bash
npm ci
npm run build
```

### 3. Verificar com testes

```bash
npm test
```

## 📋 Comandos CLI Disponíveis

### Revisar demandas de um período

```bash
npm run cli -- review-period 2026-09-14 2026-09-17
```

**Saída:**
- Total de demandas no período
- Demandas já atribuídas vs sem atribuição
- Agenda do Fábio e Leticia
- Recomendações de atribuição

### Ver agenda do Fábio

```bash
npm run cli -- fabio-schedule
```

**Exemplo de saída:**
```
📅 Buscando agenda do Fábio...

✅ 5 tarefas encontradas:

  📌 Revisar documentação
     Status: pending
     Conteúdo: Verificar contracheque do cliente
     Vencimento: 2026-09-18

  📌 Contato com cliente
     Status: pending
     Conteúdo: Confirmação de agenda
```

### Ver agenda da Leticia

```bash
npm run cli -- leticia-schedule
```

### Ver demandas ativas do Fábio

```bash
npm run cli -- fabio-demands
```

**Exemplo de saída:**
```
📋 Buscando demandas ativas do Fábio...

✅ 8 demandas encontradas:

  🔹 João Silva
     Processo: 0001234-56.2026.8.11.0001
     Estágio: Análise
     Notas: Oportunidade de planejamento previdenciário

  🔹 Maria Santos
     Processo: 0001235-56.2026.8.11.0002
     Estágio: Negociação
```

### Ver demandas ativas da Leticia

```bash
npm run cli -- leticia-demands
```

### Atribuir demanda para Fábio

```bash
npm run cli -- assign-to-fabio lawsuit-id-123
```

**Saída:**
```
✅ Demanda atribuída com sucesso!
   Cliente: João Silva
   Responsável: Fabio
   Nota: Identificada novas oportunidades para fechamento
```

### Atribuir demanda para Leticia

```bash
npm run cli -- assign-to-leticia lawsuit-id-123
```

## 🤖 Automação com GitHub Actions

O workflow `.github/workflows/crossell-review.yml` executa automaticamente:

- **Diariamente** às 08:00 UTC (05:00 Brasília)
- **Manualmente** via GitHub Actions Dispatch

### Configurar o workflow

1. Configure o secret `ADVBOX_TOKEN` no GitHub:
   - Vá para Settings > Secrets and variables > Actions
   - Click em "New repository secret"
   - Name: `ADVBOX_TOKEN`
   - Value: seu token do AdvBox
   - Click "Add secret"

2. (Opcional) Configure `ADVBOX_API_URL` se usar um endpoint customizado

### Executar manualmente

1. Vá para GitHub > Actions
2. Click em "Crossell - Revisão de Demandas Diária"
3. Click em "Run workflow"
4. (Opcional) Preencha as datas personalizadas
5. Click em "Run workflow"

### Logs e resultados

Todos os resultados aparecem nos logs do workflow:
- Demandas revisadas
- Agendas do Fábio e Leticia
- Recomendações de atribuição

## 🔌 API Endpoints Utilizados

### GET /lawsuits
Busca processos/demandas com filtros:
- `created_start` / `created_end` - Data de criação
- `responsible` - Nome do responsável (busca parcial)
- `limit` / `offset` - Paginação

Exemplo:
```
GET /lawsuits?responsible=Fabio&created_start=2026-09-14&created_end=2026-09-17
```

### GET /posts
Busca tarefas/anotações:
- `responsible` - Responsável
- `lawsuit_id` - ID do processo
- `status` - Status da tarefa (pending, completed, etc)

Exemplo:
```
GET /posts?responsible=Fabio&status=pending
```

### POST /posts
Cria novo post/anotação para atribuição

### PUT /lawsuits/{id}
Atualiza informações de um processo (responsável, estágio, etc)

> Os endpoints acima precisam ser confirmados contra a documentação/conta AdvBox antes de um disparo de produção. O token sozinho não comprova que a API e os formatos de resposta estão corretos.

## 🧪 Estrutura de Código

```
src/
├── integrations/
│   ├── advbox-client.ts          # Cliente HTTP autenticado
│   ├── advbox-lawsuits.ts        # Serviço de demandas/processos
│   ├── advbox-posts.ts           # Serviço de tarefas/agenda
│   └── advbox-customers.ts       # Serviço de clientes
├── domain/
│   ├── triage-service.ts         # Lógica de triagem
│   └── advbox-review-service.ts  # Orquestração da revisão
├── config.ts                      # Configuração
├── cli.ts                         # Linhas de comando
└── index.ts                       # Exportações públicas

test/
├── advbox-integration.test.ts     # Testes de integração
└── crossell.test.ts               # Testes de triagem
```

## 🔐 Segurança

- ✅ Token armazenado em variáveis de ambiente
- ✅ Nunca commite credenciais no git
- ✅ Use `.env` local apenas para desenvolvimento
- ✅ GitHub Secrets para produção

## 🐛 Troubleshooting

### "ADVBOX_TOKEN não configurado"

**Solução:** Verifique se o `.env` foi criado e preenchido com o token correto.

### "API error: 401 Unauthorized"

**Solução:** O token expirou ou é inválido. Verifique o GitHub Secrets.

### "Sem demandas encontradas"

**Solução:** Verifique se:
- A data está correta (formato YYYY-MM-DD)
- Existem demandas naquele período no AdvBox
- O filtro de responsável está correto

### Testes falhando

```bash
npm run build   # Verificar erros de compilação
npm test        # Executar testes novamente
```

## 📊 Workflow de Revisão Diária

```
1. GitHub Actions dispara diariamente às 08:00 UTC
   ↓
2. Calcula o período: ontem até hoje
   ↓
3. Executa: npm run cli -- review-period 2026-09-17 2026-09-18
   ↓
4. Busca demandas do período na API AdvBox
   ↓
5. Verifica agendas de Fábio e Leticia
   ↓
6. Identifica demandas sem atribuição
   ↓
7. Recomenda atribuições baseado em carga de trabalho
   ↓
8. Registra resultado nos logs
```

## 🔗 Integração com Skills Operacionais

O Crossel integra-se com duas skills especializadas para validação de casos:

### revisar-sem-oportunidade-advbox

Quando um caso vier marcado como "sem oportunidade":

```bash
/revisar-sem-oportunidade-advbox
```

**O que faz:**
- Revisa contracheques e extratos no Google Drive
- Registra evidências de demanda bancária
- Anexa documentos ao AdvBox
- Encaminha para comercial se encontrar oportunidade

**Quando usar:**
- Após CLI retornar demandas com status "no_opportunity"
- Para confirmar antes de descartar um caso

### verificar-cliente-sac-sellflux

Antes de finalizar um caso como "sem oportunidade":

```bash
/verificar-cliente-sac-sellflux
```

**O que faz:**
- Verifica histórico de atendimento no SAC do SellFlux
- Valida classificação "sem oportunidade"
- Confirma antes de fechar caso no AdvBox

**Quando usar:**
- Para casos ambíguos ou que necessitam confirmação
- Antes de descarte final

## ✅ Próximos Passos

1. Configure o `ADVBOX_TOKEN` no GitHub Secrets
2. Execute manualmente o primeiro workflow
3. Revise os logs para validar a integração
4. Para casos "sem oportunidade":
   - Use `/revisar-sem-oportunidade-advbox` para revisar Drive
   - Use `/verificar-cliente-sac-sellflux` para confirmar no SAC
5. Configure notificações se desejar (email, Slack, etc)

## 📞 Suporte

Para dúvidas ou problemas:
- Verifique os logs do workflow no GitHub
- Teste manualmente com `npm run cli`
- Revise a documentação da API do AdvBox
