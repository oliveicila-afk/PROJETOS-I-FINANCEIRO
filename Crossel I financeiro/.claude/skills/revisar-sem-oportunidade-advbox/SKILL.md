---
name: revisar-sem-oportunidade-advbox
description: Quando um caso do AdvBox vier como sem oportunidade, revisar documentos do cliente no Google Drive e procurar sinais de demanda bancaria antes de concluir.
---

# Revisar caso sem oportunidade no AdvBox

Use esta skill quando um caso estiver classificado como `sem oportunidade`. A classificacao nao pode ser encerrada apenas pela nota: a pasta do cliente no Google Drive deve ser revisada.

## Procedimento

1. Extraia do AdvBox o nome completo, CPF, telefone e numero do processo. Confirme que o caso e do cliente correto.
2. Busque a pasta do cliente no Google Drive. Se houver mais de um resultado, compare os identificadores antes de abrir ou anexar qualquer arquivo.
3. Revise todas as subpastas e arquivos relacionados a `contracheque`, `holerite`, `folha`, `extrato`, `banco`, `consignado` ou equivalentes.
4. Separe contracheques e extratos, priorizando arquivos legiveis, identificados e com periodo visivel. Nao trate ausencia de arquivo como ausencia de demanda.
5. Procure emprestimo, consignado, consignacao, CDC, parcela, margem, cartao consignado, tarifas, seguros, debitos bancarios e descontos recorrentes. Diferencie-os de imposto, previdencia, sindicato e outros descontos comuns.
6. Registre arquivo, periodo, pagina, rubrica ou lancamento e valor da evidencia.

## Quando encontrar evidencia

- Anexe ao processo ou post correto todos os contracheques e extratos relevantes revisados.
- Confirme legibilidade, identidade do cliente e ausencia de duplicatas.
- Registre no AdvBox a evidencia e os documentos anexados.
- Encaminhe para Fabio ou Leticia conforme a configuracao vigente.
- So conclua depois de confirmar anexos e atribuicao.

## Quando nao encontrar evidencia

- Registre que todos os documentos disponiveis foram revisados.
- Informe periodos e arquivos analisados quando disponiveis.
- Conclua sem encaminhar somente depois da revisao completa.
- Se a pasta nao existir, o acesso falhar ou os arquivos nao forem legiveis, registre a limitacao e mantenha o caso para revisao.

Combine esta skill com `verificar-cliente-sac-sellflux` antes de concluir uma nota negativa. Nunca exponha tokens, credenciais ou dados do cliente fora dos sistemas autorizados.