# Automacao Financeira Calandrini

Base inicial do backend que conecta o fluxo do POP ao SellFlux e ao Asaas.

## Integrações disponíveis

- Asaas: clientes e cobranças, com filtros de CPF/CNPJ, cliente, status e vencimento.
- SellFlux: campanhas do Flux v2, com paginação e filtros documentados.

Os endpoints de SAC, histórico de conversas e contatos ainda dependem do contrato específico disponibilizado para a conta SellFlux. Eles não devem ser inferidos a partir de endpoints de campanhas.

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