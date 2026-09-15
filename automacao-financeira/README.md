# Automacao Financeira Calandrini

Base inicial do backend que conecta o fluxo do POP ao SellFlux e ao Asaas.

## Integrações disponíveis

- Asaas: clientes e cobranças, com filtros de CPF/CNPJ, cliente, status e vencimento.
- Asaas Webhook: recebimento autenticado de eventos de cobrança e bloqueio de reentrega durante a execução do processo.
- SellFlux: campanhas do Flux v2, com paginação e filtros documentados.

Os endpoints de SAC, histórico de conversas e contatos ainda dependem do contrato específico disponibilizado para a conta SellFlux. Eles não devem ser inferidos a partir de endpoints de campanhas.

O endpoint local do webhook é `POST /webhooks/asaas/payments`. Configure `ASAAS_WEBHOOK_TOKEN` com um token próprio do webhook, diferente da API Key do Asaas. A idempotência desta primeira versão é mantida em memória; antes da produção, os eventos devem ser persistidos em banco ou fila com `id` único.

## Executar

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

Teste de saude:

```text
http://localhost:3000/health
```

As credenciais devem ser configuradas apenas em um arquivo `.env` local ou nos secrets do ambiente. Nunca devem ser versionadas.