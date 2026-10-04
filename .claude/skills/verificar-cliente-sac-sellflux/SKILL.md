---
name: verificar-cliente-sac-sellflux
description: "Verificar histórico de atendimento do cliente no SAC (SellFlux) para validar classificação 'sem oportunidade' antes de fechar caso no AdvBox"
---

# Verificar cliente no SAC do SellFlux

Use esta skill quando um caso estiver classificado como **sem oportunidade** e o histórico de atendimento do SAC precisar ser conferido antes do encerramento no Advbox.

## Fluxo da Verificação

### 1. Extrair o número do cliente

- Abra o caso ou post correspondente no Advbox.
- Extraia o número de telefone ou identificador usado no SellFlux.
- Preserve o formato original e confirme, quando possível, o nome do cliente para evitar consultar outra pessoa.

### 2. Acessar SAC - Chats no SellFlux

- Entre no SellFlux com a conta autorizada.
- Abra a área **SAC** e depois **Chats**.
- Aguarde o carregamento completo da lista antes de aplicar filtros ou iniciar a pesquisa.

### 3. Pesquisar o cliente

- Pesquise pelo número extraído no primeiro passo.
- Se não houver resultado, tente o formato normalizado do telefone, sem espaços, parênteses ou hífen.
- Confirme o nome, telefone e demais dados visíveis antes de abrir a conversa.
- Não conclua o caso por ausência de resultado sem registrar o formato pesquisado e validar se o número está correto.

### 4. Revisar todas as notas

- Abra a conversa do cliente.
- Expanda o máximo possível de notas, registros e histórico disponível.
- Revise notas antigas e recentes, inclusive as que exigirem rolagem ou expansão manual.
- Observe data, autor, setor, conteúdo e eventual encaminhamento de cada nota relevante.

### 5. Analisar notas por cor e setor

Classifique as notas considerando a cor e o setor responsável:

- **Amarela:** triagem, pendência ou atendimento que ainda pode exigir ação; confirme o texto antes de concluir.
- **Verde:** atendimento ou oportunidade aparentemente tratada; verifique se há resultado final registrado.
- **Vermelha:** alerta, problema, urgência ou demanda possivelmente não resolvida; trate como sinal para investigação.
- **Azul:** informação, encaminhamento ou acompanhamento; confirme se a ação prevista foi executada.

As cores são auxiliares. O conteúdo, a data e o setor prevalecem quando houver conflito entre a cor e o texto da nota.

### 6. Identificar possíveis demandas não tratadas

- Procure pedidos de contato, dúvidas sobre benefício, empréstimo, consignado, revisão, documentos ou retorno sem resposta.
- Verifique se existe promessa de retorno, encaminhamento para outro setor ou pendência sem fechamento.
- Diferencie uma demanda resolvida de uma demanda apenas registrada.
- Se não houver pendência ou oportunidade, prepare o registro de conclusão no Advbox.

### 7. Se detectar demanda: criar nova nota ou tarefa

- Crie uma nova nota ou tarefa no SellFlux ou no Advbox, conforme o fluxo vigente.
- Descreva a demanda encontrada, a data da nota original, o setor envolvido e a ação recomendada.
- Encaminhe ao responsável correto e confirme que a atribuição foi salva.
- Não marque o caso como encerrado enquanto a nova demanda não estiver registrada.

### 8. Registrar conclusão no Advbox

- Volte ao post ou à demanda original no Advbox.
- Registre se o SAC confirmou a classificação **sem oportunidade** ou se foi identificada uma demanda a tratar.
- Inclua o identificador pesquisado, o resultado da revisão e a referência às notas relevantes, sem copiar dados desnecessários.
- Só marque como concluído quando não houver pendência identificada ou quando a nova tarefa tiver sido criada e atribuída.

## Ferramentas Necessárias

- **SellFlux:** acessar SAC - Chats, pesquisar o cliente e revisar o histórico completo.
- **Advbox:** consultar o caso original, registrar a conclusão e criar ou atribuir a tarefa necessária.

Use somente contas autorizadas e não registre credenciais, tokens ou dados sensíveis em notas destinadas a outros setores.

## Observações

- Pesquise o telefone em mais de um formato quando necessário: com DDD, sem máscara e conforme o padrão aceito pelo SellFlux.
- A cor da nota ajuda na triagem, mas não substitui a leitura do conteúdo nem a confirmação do setor.
- Abra o máximo de notas permitido pela interface para não perder histórico antigo ou uma pendência que esteja fora da primeira tela.
- Combine esta verificação com `revisar-sem-oportunidade-advbox` quando também for necessário conferir contracheques no Google Drive.
- O fechamento no Advbox deve refletir o resultado real da verificação: sem demanda pendente, ou com nova demanda registrada e atribuída.