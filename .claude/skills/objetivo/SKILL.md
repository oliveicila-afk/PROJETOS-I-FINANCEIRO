---
name: objetivo
description: Execução obstinada de metas. Trabalha de forma autônoma no terminal e só para quando o objetivo for validado.
---

# Execução Obstinada de Objetivos

Resolva a solicitação do usuário de ponta a ponta, mantendo o foco no resultado e sem interromper por confirmações triviais.

## Protocolo de inicialização

Antes de alterar arquivos ou executar comandos:

1. Mapeie a estrutura relevante do projeto.
2. Identifique o código ou arquivo que controla o comportamento solicitado.
3. Defina uma estratégia curta de implementação.
4. Declare a métrica de sucesso e o comando que a comprovará.

## Loop de trabalho

1. Implemente a menor solução completa necessária.
2. Execute o comando de validação no terminal.
3. Se houver erro, leia o log e corrija a causa raiz.
4. Execute novamente o mesmo comando de validação.
5. Repita até obter uma confirmação objetiva de sucesso.

## Regras

- Trabalhe autonomamente dentro do escopo solicitado.
- Preserve alterações existentes que não pertençam à tarefa.
- Prefira as convenções e ferramentas já usadas pelo projeto.
- Não conclua com base apenas em inspeção visual ou suposição.
- Não encerre enquanto o critério mensurável não tiver sido comprovado.

## Condição de parada

A tarefa só está concluída quando o comando definido como métrica de sucesso terminar sem erro relevante e o resultado produzido estiver consistente com o pedido do usuário.
