# AdvBox Asaas Conciliacao

Base isolada para conciliacao de pagamentos Asaas com o cliente contratante no AdvBox. A regra Bemol foi movida para este projeto porque trata de atribuicao de recebimento, e nao de atendimento de boleto.

O adapter real do AdvBox, os conectores bancarios e a persistencia ainda dependem dos contratos externos. Enquanto eles nao forem confirmados, o codigo trabalha com dominio puro, fixtures e gateways injetados; nao ha lancamento real.

## Executar

```powershell
npm.cmd install
npm.cmd run build
npm.cmd test
```