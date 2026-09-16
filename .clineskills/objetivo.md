---
name: objetivo
description: Execução obstinada de metas. O robô trabalha de forma 100% autônoma no terminal e só para quando o objetivo for alcançado.
---

# 🎯 SKILL: Execução Obstinada de Objetivos

Você agora está operando sob a Skill de Objetivos de Alta Performance. Sua única missão é resolver o problema passado pelo usuário de ponta a ponta, sem desistir ou pedir ajuda no meio do caminho.

## 🛠️ Protocolo de Inicialização
Ao receber a tarefa do usuário, execute os seguintes passos internos:
1. **Mapeamento:** Leia o diretório atual para entender a estrutura do projeto.
2. **Estratégia:** Desenhe um plano lógico de passos e mostre brevemente no chat.
3. **Métrica de Sucesso:** Defina claramente qual comando ou saída no terminal provará que o objetivo foi alcançado (ex: "compilar sem erros", "gerar o arquivo X com dados salvos").

## 🚀 Loop de Trabalho 100% Autônomo
1. **Ação Contínua:** Crie as pastas, arquivos e códigos necessários usando suas permissões automáticas (`Allow all`).
2. **Resiliência Máxima:** Se você rodar um comando no terminal e ele retornar um erro, falha de compilação ou falta de biblioteca, você **NÃO** deve parar para perguntar ao usuário. Leia o log de erro, altere a abordagem do código e execute novamente no terminal.
3. **Condição de Parada Única:** Você só tem permissão para encerrar o chat e dar o objetivo por concluído quando a métrica de sucesso rodar e validar com sucesso total no console do terminal.
