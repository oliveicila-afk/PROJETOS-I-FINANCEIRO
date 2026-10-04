---
name: revisar-sem-oportunidade-advbox
description: "Quando um post do Advbox vier 'sem oportunidade', confere no Drive todos os contracheques e extratos bancários do cliente por sinais de demanda bancária, anexa os documentos ao Advbox e, se achar oportunidade, encaminha pro comercial."
---

# Revisar caso sem oportunidade no Advbox

## Quando usar

Use esta skill no workflow automático `triagem-advbox-comercial` quando um post do Advbox estiver classificado como **sem oportunidade**. A classificação só pode ser encerrada depois da conferência do contracheque disponível no Google Drive.

O objetivo é identificar sinais de empréstimo ou consignado que possam representar uma oportunidade comercial. Não altere a classificação apenas por inferência: registre a evidência encontrada no caso.

## Passo a passo

### 1. Extrair o nome do cliente no Advbox

- Abra o post ou a demanda que recebeu a classificação **sem oportunidade**.
- Copie o nome completo do cliente exatamente como aparece no Advbox.
- Confirme que o post pertence ao cliente correto antes de pesquisar documentos.

### 2. Buscar a pasta no Google Drive

- Pesquise o nome completo no Google Drive.
- Quando houver mais de um resultado, compare CPF, matrícula, processo ou outros identificadores disponíveis no Advbox.
- Abra somente a pasta que puder ser associada ao cliente com segurança.
- Se a pasta não for encontrada, registre essa ausência no post e siga a política definida pelo fluxo antes de concluir.

### 3. Navegar até a pasta do contracheque

- Dentro da pasta do cliente, procure pastas ou arquivos com nomes como `contracheque`, `holerite`, `folha`, `remuneração`, `extrato`, `extrato bancário`, `conta`, `banco` ou equivalentes.
- Verifique subpastas por ano, mês, órgão ou vínculo funcional.
- Inclua tanto os contracheques quanto os extratos bancários relacionados ao cliente; a revisão não deve ficar limitada ao arquivo mais recente.
- Dê preferência aos documentos do período relacionado à demanda do Advbox, sem descartar documentos anteriores que ajudem a demonstrar parcelas, recorrência ou origem do débito.

### 4. Listar e priorizar arquivos

- Liste todos os arquivos candidatos antes de abrir um deles, separando contracheques de extratos bancários.
- Priorize PDFs legíveis, documentos com identificação do cliente e arquivos que tenham data ou período visível.
- Revise todos os contracheques e extratos bancários disponíveis que estejam relacionados ao cliente e à demanda, não apenas um documento de amostra.
- Não trate um arquivo sem identificação como prova sem confirmar que ele pertence ao cliente.
- Antes de anexar, confira nome, período e conteúdo para evitar documentos de outra pessoa, duplicados ou arquivos sem relação com a demanda bancária.

### 5. Ler os documentos e procurar sinais de demanda bancária

- Abra cada contracheque e extrato selecionado e procure sinais relacionados a `empréstimo`, `consignado`, `consignação`, `CDC`, `parcela`, `margem`, `cartão consignado`, tarifas, débitos bancários ou termos equivalentes.
- Nos contracheques, observe códigos de desconto recorrente, quantidade de parcelas, banco/financeira e valor descontado.
- Nos extratos, observe empréstimos creditados, débitos de parcelas, descontos automáticos, tarifas, seguros, cartão consignado e transferências que indiquem uma demanda bancária.
- Diferencie empréstimo ou consignado de descontos comuns, como previdência, imposto, sindicato ou benefícios.
- Registre o nome de cada arquivo, período, página, rubrica ou lançamento e valor da evidência encontrada.

### 6. Se encontrar sinal: anexar documentos, comentar, atribuir e concluir

Quando houver evidência de empréstimo, consignado ou outra demanda bancária:

1. Selecione no Drive todos os contracheques e extratos bancários revisados que tenham relação com a demanda, incluindo os documentos que comprovem recorrência ou evolução das parcelas.
2. Faça upload/anexe todos esses documentos ao cadastro, processo ou post correto do cliente no Advbox.
3. Confirme no Advbox que cada anexo foi carregado, está legível e pertence ao cliente correto; não considere suficiente apenas colar o link do Drive.
4. Adicione um comentário no post do Advbox com a evidência objetiva, os períodos analisados e a lista dos documentos anexados.
5. Encaminhe ou atribua a demanda ao responsável pelo comercial, conforme a configuração vigente do Advbox.
6. Marque o post ou a tarefa como concluído somente depois de confirmar os anexos e a atribuição.

O comentário deve permitir que o comercial entenda o motivo do encaminhamento sem precisar repetir a busca. Se o Advbox limitar tamanho, quantidade ou formato de anexos, registre essa limitação e anexe os arquivos prioritários, mantendo a referência aos demais no comentário.

### 7. Se não encontrar: concluir diretamente

- Se todos os contracheques e extratos bancários disponíveis forem revisados e nenhum sinal for encontrado, registre no post que a conferência foi realizada.
- Informe quais períodos ou arquivos foram analisados, quando essa informação estiver disponível.
- Marque o post como concluído sem encaminhar ao comercial.
- Se não houver contracheque, extrato bancário, PDF legível ou acesso à pasta, registre a limitação em vez de afirmar que não existe demanda bancária.

## Ferramentas

- **Google Drive:** localizar a pasta do cliente, navegar pelas subpastas e abrir os contracheques.
- **Claude in Chrome:** operar a interface do Drive e do Advbox quando o fluxo for manual.
- **Advbox:** anexar os contracheques e extratos bancários ao cadastro/processo/post correto, adicionar comentário, atribuir responsável e alterar o status.
- **API do Advbox (futuro):** buscar o post, enviar anexos, adicionar comentário, atribuir responsável e alterar o status sem operação manual.

Use apenas os acessos já autorizados. Nunca exponha tokens, credenciais ou dados do cliente em comentários fora do Advbox.

## Observações

- Contracheques da SEDUC podem apresentar rubricas abreviadas, códigos internos e descontos distribuídos em mais de uma seção. Leia o cabeçalho e a legenda do documento antes de interpretar uma rubrica.
- Para uma demanda bancária, o conjunto de documentos esperado é: todos os contracheques relevantes encontrados e todos os extratos bancários relevantes encontrados, após conferência de identidade, período e legibilidade.
- O upload deve ser feito no registro correto do cliente no Advbox, preservando o nome original e evitando anexar documentos de terceiros ou duplicatas.
- Um valor parcelado ou desconto identificado como banco/financeira é um indício relevante, mas a evidência deve ser registrada com o texto visível no documento.
- A ausência de um arquivo não equivale à ausência de oportunidade.
- Combine esta verificação com a skill `verificar-cliente-sac-sellflux` quando o fluxo também exigir a validação do histórico de atendimento no SAC.