# Crossell Financeiro

Status: base dedicada ao fluxo de triagem financeira descrito no PDF.

## Escopo

Este repositorio concentra as regras de triagem financeira do AdvBox: classificacao dos casos, encaminhamento para Fabio/Leticia, anexos, prioridades e relatorio diario `CROSSELL - AUTOMAÇÃO`.

### Incluido

- classificacao de oportunidades, acoes bancarias, casos sem oportunidade e ambiguos;
- filtro por usuarios do time financeiro nas tarefas do AdvBox;
- encaminhamento para Fabio ou Leticia;
- anexos de contracheque e extrato;
- sinalizacao urgente e importante para possivel pagamento inicial;
- relatorio diario completo com assunto `CROSSELL - AUTOMAÇÃO`;
- exclusao de notas que informam que nao existe nova oportunidade;
- revisao de documentos no Gmail/Drive e notas do SAC quando a nota negar uma demanda;
- nota padrao de encaminhamento sem copiar a tarefa original;
- janela incremental entre o ultimo disparo e o disparo atual;
- portas explicitas para conectar as APIs externas de AdvBox e e-mail.

### Fora do escopo atual

- chamadas reais das APIs externas;
- leitura OCR de documentos;
- credenciais reais.

## Critérios de aceitacao

- `npm.cmd run build` conclui sem erros;
- `npm.cmd test` passa em todos os testes do projeto;
- casos sao classificados em uma das quatro categorias previstas;
- somente tarefas com Gabriele, Kássia Lorena Goudinho ou Priscila como usuarios do time financeiro entram na revisao;
- oportunidades e acoes bancarias recebem encaminhamento comercial;
- documentos disponiveis sao preservados como anexos;
- possivel pagamento inicial marca o caso como urgente e importante;
- notas com nenhuma oportunidade nao sao encaminhadas;
- uma nota negativa sem revisao externa permanece ambigua;
- evidencias de demanda encontradas em documentos ou SAC geram encaminhamento;
- o relatorio informa a quantidade total encaminhada e detalha nome/processo apenas dos ambiguos;
- cada rodada processa somente o intervalo desde o ultimo disparo.

## Riscos e controles

| Risco | Controle |
|---|---|
| Regra do PDF nao estar no codigo-fonte local | manter a lacuna documentada e nao simular envio ou encaminhamento |
| Cliente errado por nome semelhante | exigir CPF/CNPJ ou sinalizar ambiguidade |
| Disparo indevido | manter envio atras de integracao autenticada e testes |
| Credencial exposta | usar somente variaveis de ambiente e `.gitignore` |

## Validacao

O projeto deve ser validado com testes unitarios de identificacao, cobrancas, resposta e webhook. A integracao real com AdvBox, anexos e relatorio so pode ser habilitada depois da confirmacao dos contratos externos e de um piloto sem disparo automatico.