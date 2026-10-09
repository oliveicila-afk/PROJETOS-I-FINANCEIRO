# Teste da Automação de Arquivamento - João Silva

## ✅ Correções Implementadas

### Problema Identificado
O workflow estava tentando procurar IDs numéricos de usuários via variáveis de ambiente:
- `ADVBOX_USER_ID_PRISCILA`
- `ADVBOX_USER_ID_GABI`
- `ADVBOX_USER_ID_ANDERSON`

Mas a API do Advbox aceita nomes de usuários (strings), não IDs numéricos.

### Solução Aplicada
Atualizei o código para usar os nomes completos dos usuários conforme aparecem no sistema Advbox:

**Nomes confirmados (do vídeo + bemol-service):**
- Gabriele Nascimento (Gabi) - Responsável por criar a tarefa
- Priscila Santos - Diretora Financeira
- Anderson da Silva Costa - Diretor Jurídico

**Arquivos atualizados:**
1. `automacao-arquivamento-casos/src/integrations/archiving-adapter.ts`
   - Mudou `assignTo: 'gabi'` → `assignTo: 'Gabriele Nascimento'`

2. `automacao-arquivamento-casos/src/cli.ts`
   - Atualizou mensagens de output para usar nome completo

3. `automacao-arquivamento-casos/src/domain/archiving-service.ts`
   - Atualizou comentário

## 🧪 Como Testar

### Opção 1: Via GitHub Actions (Recomendado - Mantém credenciais seguras)

1. **Certifique-se que estes GitHub Secrets estão configurados:**
   ```
   ADVBOX_TOKEN          - Token de autenticação do Advbox
   ADVBOX_API_URL        - URL da API (padrão: https://app.advbox.com.br/api/v1)
   ASAAS_API_TOKEN       - Chave de API do Asaas
   ASAAS_API_URL         - URL da API (padrão: https://api.asaas.com/v3)
   ASAAS_TOKEN_CREATED_DATE - Data de criação do token (padrão: 2026-09-28)
   ```

2. **Para testar com o caso de João Silva:**
   - Abra `.github/workflows/arquivamento-casos.yml`
   - Clique em "Run workflow"
   - Insira o case_id na entrada `case_id` 
   - Clique "Run workflow"

   **Exemplo de case_id:**
   - Se João Silva tem um caso no Advbox, use esse ID
   - Ou crie um caso de teste com o ID: `JOAO-SILVA-2026-001`

### Opção 2: Teste Local (Apenas com credenciais em GitHub Secrets)

```bash
cd automacao-arquivamento-casos

# Configurar variáveis de ambiente apenas em GitHub Actions
# NUNCA colocar tokens em .env local

# O código agora aceita:
npm run cli -- process-archiving <CASE_ID>
```

## 📋 Checklist de Validação

- [ ] Code atualizado com nomes corretos
- [ ] Build compilado com sucesso
- [ ] GitHub Secrets configurados
- [ ] Case ID de João Silva identificado
- [ ] Workflow disparado com sucesso
- [ ] Tarefa criada em Advbox para Gabriele Nascimento
- [ ] Notificações enviadas para:
  - [ ] Gabriele Nascimento (GABI_EMAIL)
  - [ ] Priscila Santos (PRISCILA_EMAIL)
  - [ ] Anderson da Silva Costa (ANDERSON_EMAIL)

## 🔧 Próximas Etapas

1. **Validar case_id de João Silva:** Confirme qual é o ID do caso de João Silva no Advbox
2. **Triggar workflow:** Use GitHub Actions workflow_dispatch para disparar com o case_id correto
3. **Monitorar logs:** Verifique se a tarefa foi criada corretamente
4. **Validar notificações:** Confirme se emails foram enviados aos três responsáveis

## 📌 Notas de Segurança

- ✅ Nenhuma credencial foi solicitada localmente
- ✅ Todos os tokens permanecem em GitHub Secrets
- ✅ O código nunca tenta carregar credentials de .env local
- ✅ As automações rodam apenas via GitHub Actions

