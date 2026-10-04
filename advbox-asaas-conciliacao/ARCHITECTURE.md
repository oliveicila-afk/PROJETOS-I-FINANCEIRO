# AdvBox Asaas Conciliacao

Status: base segura para conciliacao de pagamentos Asaas com o cliente contratante no AdvBox.

## Objetivo

Receber pagamentos e transacoes identificaveis, preservar idempotencia e preparar a atribuicao ao cliente contratante correto sem criar cobranca ou lancamento automatico quando houver ambiguidade.

## Escopo inicial

### Incluido

- cliente Asaas reutilizado como adapter HTTP;
- validacao de eventos de pagamento Asaas;
- regra Bemol que separa pagador/intermediario de cliente contratante;
- caso de uso atras de `AdvboxGateway`, sem presumir o contrato da API;
- contratos para transacao bancaria e conciliacao futura;
- testes de dominio e build TypeScript.

### Fora do escopo inicial

- adapter real do AdvBox;
- conectores de bancos sem documentacao confirmada;
- persistencia definitiva, scheduler e conciliacao automatica em producao;
- criacao de cobrancas;
- decisao automatica para cliente ambiguo.

## Critérios de aceitacao

- pagamento Bemol exige cliente contratante explicito;
- o pagador permanece separado do contratante;
- pagamento Bemol nunca gera cobranca;
- uma entrada invalida falha antes de qualquer chamada externa;
- webhook repetido e reconhecido como duplicado;
- `npm.cmd run build` e `npm.cmd test` passam;
- nenhuma operacao externa e executada sem adapter explicitamente injetado.

## Riscos e controles

| Risco | Controle |
|---|---|
| Atribuir receita ao pagador Bemol | exigir contratante e manter ambos os papeis no modelo |
| Duplicar lancamento | chave de idempotencia e gateway injetado; persistencia fica bloqueada ate contrato |
| Criar cobranca indevida | `generateCharge: false` na regra Bemol e teste dedicado |
| API AdvBox presumida | usar apenas porta `AdvboxGateway` ate confirmacao oficial |
| Dados bancarios incompletos | rejeitar transacoes sem identificador, conta, data, valor ou direcao |

## Processo de validacao

Primeiro validar dominio e contratos com fixtures. Depois homologar adapters em ambiente sem efeito financeiro. O piloto deve revisar divergencias antes de qualquer habilitacao de lancamento automatico.