# Arquitetura - Automação de Arquivamento de Casos

## Diagnóstico e Objetivo

O escritório precisa automatizar o procedimento de arquivamento de casos encerrados, coletando informações de múltiplas fontes (Advbox, Asaas) sem expor credenciais ou dados sensíveis. O objetivo é eliminar trabalho manual, gerar protocolo automático e criar alertas estruturados para validação final.

**Indicadores iniciais:** Protocolo gerado sem erro, credenciais não expostas em logs/conversas, número do processo extraído do Asaas, alertas estruturados para múltiplas ações.

## Processo

Hoje o arquivamento depende de buscas manuais no Advbox/Asaas. Com a automação:
1. Sistema busca informações do caso no Advbox
2. Adaptador isolado extrai número do processo no Asaas
3. Protocolo é gerado automaticamente
4. Tarefa centralizada é criada para Gabi
5. Alertas estruturados sinalizam validações necessárias

| Etapa | R | A | C | I |
|-------|---|---|---|---|
| Configurar credenciais | Admin repositório | Admin repositório | DevOps | Financeiro |
| Disparar arquivamento | Gabi/Financeiro | Gestor financeiro | TI | Jurídico |
| Validar alertas | Gabi | Gestor financeiro | Jurídico | Admin |

**Controles:** Credenciais apenas em GitHub Secrets; código nunca referencia valores reais; logs mascarados; adaptador isolado para APIs; sem exposição de CPF/processo.

## Tecnologia e Entregáveis

- **TypeScript** para type-safety e documentação de contrato
- **GitHub Actions** para execução segura em servidor próprio (não cloud)
- **Adaptador único** (`archiving-adapter.ts`) como fronteira para Advbox/Asaas
- **Config isolado** lê variáveis de ambiente via `dotenv`
- Integração com **CLI** e **Automation Service**

**Entregues neste MVP:**
- Coleta de informações (Advbox + Asaas)
- Extração de sucumbencial e número do processo
- Geração de protocolo com alertas
- Tarefa centralizada para Gabi
- Mascaramento de dados sensíveis

**Não entregue:** Busca automática de casos encerrados, integração com Google Drive, dashboard de acompanhamento (Phase 2).

## Critérios de Aceitação

1. `npm run build` termina sem erros de TypeScript
2. Projeto possui `package.json`, `.env.example`, `.gitignore`, `src/integrations/archiving-adapter.ts`
3. Protocolo é gerado com todos os campos obrigatórios
4. Sem `ADVBOX_TOKEN`, sistema retorna erro claro
5. Arquivos sensíveis (`.env`, `*.log`) ignorados pelo Git
6. CLI executa sem expor credenciais: `npm run cli -- process-archiving CASO123`
7. Tarefa criada com sucesso no Advbox atribuída para Gabi

## Arquitetura de Camadas

```
CLI (src/cli.ts)
    ↓
Archiving Service (src/domain/archiving-service.ts)
    ↓
Archiving Adapter (src/integrations/archiving-adapter.ts) ← Fronteira única
    ├─ AdvBox Client (calls via adapter, nunca direto)
    └─ Asaas Client (calls via adapter, nunca direto)
    ↓
Config (src/config.ts) ← Credenciais via .env
```

**Isolamento:** Clients não conhecem CLI. Adapter não conhece Service logic. Config não referencia valores reais.

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Credencial exposta no repositório | `.env.example` sem valores, `.gitignore` protege `.env`, GitHub Secrets para CI/CD |
| CPF/Processo exposto em logs | Mascaramento ativado por padrão, logs em modo seguro |
| Múltiplas chamadas à API quebram fluxo | Adapter centraliza retry logic e tratamento de erro |
| Asaas indisponível durante execução | Timeout configurado, erro tratado, alerta estruturado |
| Tarefa não criada no Advbox | Validação antes de criar, retry lógico, log de falha |
| API Advbox muda contrato | Validação de resposta em adapter, método versioned se necessário |
| Dados sensíveis em tarefa do Advbox | Protocolo usa IDs, não valores reais; CPF mascarado |

## Validação e Evolução

**Fase 1 (Current MVP):**
- [x] Coleta manual via CLI
- [x] Geração de protocolo
- [x] Alertas estruturados
- [ ] GitHub Actions agendado (pronto para ativar)

**Fase 2:**
- [ ] Busca automática de casos encerrados
- [ ] Integração com Google Drive (anexos)
- [ ] Dashboard de acompanhamento
- [ ] Relatório mensal de casos fora da curva

**Antes de Produção:**
- Testar com dados não-sensíveis
- Validar Advbox retorna tarefa criada
- Confirmar alertas com Gabi
- Revisar mascaramento de CPF em todas as saídas
- Definir política de rotação de tokens Advbox/Asaas

## Segurança de Dados

1. **Credenciais:** Apenas em GitHub Secrets, nunca em código
2. **Logs:** Mascaramento automático de CPF (últimos 3 dígitos) e números de processo
3. **Protocolos:** IDs usados em vez de valores reais quando possível
4. **Erros:** Mensagens genéricas sem detalhe de falha técnica
5. **Persistência:** Nenhum dados local persistido (stateless)

## Como Evoluir

1. **Nova fonte de dados?** Adicione novo client em `integrations/`, registre em `archiving-adapter.ts`
2. **Novo alerta?** Implemente em `archiving-service.ts`, sem tocar em clients
3. **Novo motivo de arquivamento?** Estenda `ARCHIVING_REASONS` enum, não impacta clients/adapter
4. **Mudar formato de protocolo?** Altere template em `archiving-service.ts`, adapter continua igual

**Padrão:** Mudanças de negócio → Service. Mudanças de integração → Adapter. Mudanças de entrada/saída → CLI.
