# Automação de Arquivamento de Casos

Automação do procedimento de arquivamento de casos encerrados do escritório de advocacia, integrando Advbox e Asaas.

## 📋 Funcionalidades

- ✅ Coleta automática de informações de arquivamento (Advbox + Asaas)
- ✅ Validação de dados (sucumbencial, número do processo)
- ✅ Detecção de múltiplas ações do cliente
- ✅ Geração automática de protocolo de arquivamento
- ✅ Criação de tarefa centralizada para Gabi
- ✅ Alertas estruturados para validação manual

## 🚀 Setup

### Requisitos
- Node.js 22+
- Credenciais Advbox (token)
- Credenciais Asaas (API key)

### Instalação Local

```bash
cd automacao-arquivamento-casos
npm install
cp .env.example .env
# Editar .env com suas credenciais
```

### Build

```bash
npm run build
```

### Testes

```bash
npm test
```

## 📖 Uso

### CLI Local

```bash
# Coletar informações de um caso
npm run cli -- collect-info CASO123

# Criar protocolo de arquivamento
npm run cli -- create-protocol CASO123

# Processar arquivamento completo (coleta + protocolo)
npm run cli -- process-archiving CASO123

# Listar motivos de arquivamento
npm run cli -- list-archiving-reasons
```

### GitHub Actions

Executa automaticamente 2x/dia (10:00 e 16:00 Brasília) via workflow `.github/workflows/arquivamento-casos.yml`.

Para executar manualmente:
1. Ir para **Actions** > **Automação - Arquivamento de Casos**
2. Clicar em **Run workflow**
3. Opcionalmente informar ID do caso

### Scripts de Debug

#### Inspeccionar Campos da API AdvBox

Para diagnosticar quais campos estão disponíveis na API do AdvBox:

1. Ir para **Actions** > **Debug AdvBox API Fields**
2. Clicar em **Run workflow**
3. Verificar o log de saída para ver a estrutura da resposta
4. Baixar o artefato `api-debug-results` para inspecionar o JSON completo

Este script ajuda a identificar:
- Nomes exatos dos campos disponíveis
- Valores de campos de percentual/honorários
- Estrutura completa da resposta da API

**Útil quando:**
- Novos campos precisam ser extraídos
- Mudanças na API afetam os nomes dos campos
- Precisão de dados de percentual/honorários está em dúvida

## 🔐 Variáveis de Ambiente

Obrigatórias:
- `ADVBOX_TOKEN` - Token de autenticação Advbox
- `ASAAS_API_KEY` - Chave de API Asaas

Opcionais:
- `ADVBOX_API_URL` - URL da API Advbox (padrão: https://app.advbox.com.br/api/v1)
- `ASAAS_API_URL` - URL da API Asaas (padrão: https://api.asaas.com/v3)
- `MASK_CPF` - Mascarar CPF em logs (padrão: false)

## 🏗️ Arquitetura

```
src/
├── config.ts                 # Configurações e variáveis de ambiente
├── integrations/
│   ├── advbox-client.ts     # Cliente API do Advbox
│   └── asaas-client.ts      # Cliente API do Asaas
├── domain/
│   └── archiving-service.ts # Lógica de negócio de arquivamento
└── cli.ts                    # Interface de linha de comando
```

## 🔄 Fluxo de Arquivamento

1. **Coleta de Informações**
   - Busca dados do caso no Advbox
   - Localiza número do processo no Asaas
   - Extrai sucumbencial de tarefas
   - Verifica múltiplas ações do cliente

2. **Validações**
   - Gera alertas para dados faltantes
   - Valida múltiplas ações
   - Verifica integridade do informativo

3. **Criação de Protocolo**
   - Monta protocolo com todos os dados
   - Cria tarefa no Advbox para Gabi
   - Documenta observações e alertas

## ⚠️ Alertas Automáticos

O sistema gera alertas para:
- Número do processo não encontrado
- Cliente com múltiplas ações em andamento
- Informativo de arquivamento incompleto
- Dados sensíveis expostos

## 🔒 Segurança de Dados

- ✅ CPF mascarado em logs (quando `MASK_CPF=true`)
- ✅ Tokens não são exibidos
- ✅ Números de processo armazenados apenas em variáveis de ambiente
- ✅ Sem exposição de dados sensíveis em conversas abertas

## 📝 Motivos de Arquivamento Suportados

- Ganhamos o processo (WON)
- Perda por Falta de Custas (LOST_COSTS)
- Sentença Desfavorável (UNFAVORABLE)
- Extinção por Inércia (INERTIA)
- Prescrição ou Decadência (PRESCRIPTION)
- Ilegitimidade (ILLEGITIMACY)
- Acordo / Transação Homologada (SETTLEMENT)
- Falha Operacional / Prazo (OPERATIONAL_FAILURE)
- Outros motivos (OTHER)

## 🔄 Próximos Passos

- [ ] Implementar busca automática de casos encerrados
- [ ] Integração com Google Drive para anexos
- [ ] Dashboard de acompanhamento
- [ ] Relatório de casos fora da curva
- [ ] Validação de benefício de justiça gratuita

## 📞 Suporte

Para dúvidas, contactar a equipe de desenvolvimento.
