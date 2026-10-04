---
name: arquitetura-de-projeto
description: Use quando o usuário pedir para criar um novo projeto, procedimento ou processo e precisar definir escopo, arquitetura, responsabilidades, riscos e critérios de validação antes de começar a implementar.
---

# 🏗️ SKILL: Arquitetura de Projeto e Procedimentos

Sempre que esta skill for invocada, não comece a codificar direto. Primeiro construa a arquitetura do projeto/procedimento seguindo as duas dimensões abaixo — a do **processo/procedimento organizacional** e a do **escopo técnico do projeto** — e só então parta para a execução (usar a skill `smart-goal-execution` ou `objetivo` para a execução em si).

Produza a arquitetura como um documento estruturado (arquivo `ARCHITECTURE.md` ou seção no início da conversa) antes de escrever código, cobrindo os blocos abaixo. Pule apenas os blocos claramente irrelevantes para o pedido, mas nunca pule o Escopo, os Critérios de Aceitação e a Matriz de Riscos.

## Bloco 1 — Diagnóstico e Alinhamento Estratégico

- **Mapeamento do problema:** qual é o gargalo real (erro de comunicação, lentidão, retrabalho, desperdício financeiro)?
- **Objetivo central:** uma única frase que define o que é sucesso.
- **KPIs / indicadores de sucesso:** como o sucesso será medido (custo por processo, tempo de ciclo, taxa de erro, etc.).

## Bloco 2 — Desenho de Processo (Arquitetura)

- **As Is / To Be:** documente como o trabalho é feito hoje e desenhe como passará a ser feito.
- **Matriz RACI:** para cada etapa, defina quem é Responsável (R), quem Aprova (A), quem é Consultado (C) e quem é Informado (I).
- **Gargalos e controles:** trave pontos de aprovação e validações para evitar fraudes, erros graves ou retrabalho.

## Bloco 3 — Infraestrutura, Tecnologia e Ferramentas

- **Sistemas e softwares:** quais ferramentas serão usadas ou adaptadas (CRM, ERP, gerenciador de tarefas, banco de dados).
- **Automação:** o que pode ser automatizado (integrações, webhooks, scripts) para reduzir trabalho manual.
- **Ambiente e acessos:** garantir permissões, segurança da informação e credenciais necessárias.
- **Tecnologias:** escolha baseada em estabilidade e no que o projeto já usa, não em modismo.

## Bloco 4 — Escopo Inquestionável

- **Objetivo central:** uma frase que define o sucesso do projeto (pode reaproveitar o do Bloco 1).
- **Entregáveis tangíveis:** lista exata do que será entregue **e do que não será entregue**.
- **Critérios de aceitação:** regras binárias/mensuráveis para dizer se a entrega presta ou não (nunca critérios subjetivos).

## Bloco 5 — Restrições, Cronograma e Orçamento

- **Cronograma com margem de segurança:** aplique um multiplicador de risco de 1.3x a 1.5x sobre o prazo estimado.
- **Orçamento de contingência:** reserve recursos (financeiros, de tempo ou de esforço) para imprevistos.

## Bloco 6 — Matriz de Riscos

- **Identificação:** liste tudo que pode dar errado (falha técnica, ausência de pessoal, estouro de prazo, dependência externa indisponível).
- **Mitigação:** para cada risco identificado, defina um plano de ação imediato (não deixe risco sem mitigação).

## Bloco 7 — Processo de Validação (Zero Erros)

- **Checklists de etapa:** o projeto só avança de fase se 100% dos itens da etapa anterior estiverem checados.
- **Testes de estresse:** simule cenários extremos (carga, falha de integração, dados inválidos) antes do lançamento.

## Bloco 8 — Gestão de Mudança e Cultura (quando há pessoas/equipes envolvidas)

- **Comunicação interna:** explique o porquê da mudança e o benefício para quem vai operar o processo, não só para a empresa.
- **Treinamento:** produza POPs (Procedimento Operacional Padrão) visuais, vídeos ou exemplos práticos.
- **Engajamento de lideranças:** confirme que gestores/supervisores apoiam e cobram o uso do novo processo.

## Bloco 9 — Governança e Melhoria Contínua

- **Piloto:** rode o novo procedimento/projeto primeiro com um grupo menor ou caso de uso específico antes do rollout total.
- **Ciclos de revisão:** agende auditorias periódicas para checar aderência ou obsolescência do processo.

## Fluxo de trabalho da skill

1. Faça as perguntas mínimas necessárias (via `vscode_askQuestions`) apenas se o objetivo, os entregáveis ou os critérios de aceitação estiverem ambíguos — não pergunte o óbvio.
2. Preencha os Blocos 1, 4, 6 e 7 obrigatoriamente. Preencha os demais quando aplicável ao tipo de pedido (projeto de software, processo organizacional, automação, etc.).
3. Registre a arquitetura resultante em um arquivo (ex.: `ARCHITECTURE.md` na raiz do novo projeto) antes de gerar código ou estrutura de pastas.
4. Use a arquitetura como checklist de execução: implemente, valide cada entregável contra os critérios de aceitação e só avance de fase quando o checklist da etapa estiver 100% concluído.
5. Ao final, confirme que todos os riscos do Bloco 6 têm mitigação registrada e que os testes de estresse (Bloco 7) foram executados ou pelo menos planejados.

## Regras

- Nunca comece a implementar sem escopo e critérios de aceitação definidos.
- Critérios de aceitação devem ser binários/mensuráveis, nunca vagos ("funcionar bem", "ficar rápido").
- Todo risco identificado precisa de mitigação — não deixe a lista de riscos sem plano de ação.
- Prefira ferramentas e tecnologias já usadas no restante do workspace, salvo justificativa explícita.
- Depois que a arquitetura estiver definida, use a skill `smart-goal-execution` ou `objetivo` para a execução autônoma e validada no terminal.
