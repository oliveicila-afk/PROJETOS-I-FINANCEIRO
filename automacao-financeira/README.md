# Automacao Financeira Calandrini

Base inicial do backend que vai conectar o fluxo do POP ao Sellflux e ao Asaas.

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