---
name: verificar-cliente-sac-sellflux
description: Verificar o historico do cliente no SAC do SellFlux antes de fechar um caso sem oportunidade no AdvBox.
---

# Verificar cliente no SAC do SellFlux

Use esta skill quando a nota disser `sem oportunidade`, `nenhuma` ou equivalente. A nota deve ser conferida no SAC antes do encerramento.

## Procedimento

1. Extraia do AdvBox o telefone ou identificador do cliente e confirme o nome.
2. No SellFlux, abra `SAC` e `Chats` e aguarde a lista carregar completamente.
3. Pesquise o telefone no formato original e, se necessario, sem mascara, espacos, parenteses ou hifens.
4. Confirme nome e telefone antes de abrir a conversa. Registre o formato pesquisado se nenhum resultado aparecer.
5. Expanda e revise todo o historico disponivel, incluindo notas antigas, recentes, autores, setores, datas e encaminhamentos.
6. Procure pedidos de contato, emprestimo, consignado, revisao, documentos, retorno pendente ou demanda apenas registrada e ainda nao resolvida.
7. Diferencie demanda resolvida de demanda que so foi anotada. A cor da nota e auxiliar; o texto, a data e o setor prevalecem.

## Resultado

- Se encontrar demanda, registre a evidencia, crie ou atualize a tarefa conforme o fluxo e encaminhe para Fabio ou Leticia.
- Se nao encontrar demanda, registre no AdvBox o identificador consultado e o resultado da revisao.
- Nao conclua sem oportunidade enquanto a consulta do SAC nao tiver sido realizada.
- So marque o caso como concluido quando nao houver pendencia ou quando a nova tarefa estiver criada e atribuida.

Combine esta skill com `revisar-sem-oportunidade-advbox` quando tambem for necessario revisar contracheques e extratos no Google Drive. Nunca registre credenciais ou tokens nas notas.