# BOLETO I FINANCEIRO

Repositório específico para o fluxo financeiro de boletos.

## Objetivo

- atender o fluxo financeiro de boletos
- consultar pendências e cliente
- gerar respostas automáticas relacionadas a boletos
- integrar com a infraestrutura financeira e comunicação

## Prévia segura de boleto

A rota abaixo consulta o Asaas e monta os dados do boleto sem enviar mensagem:

```text
POST /boletos/preview
```

Exemplo de corpo:

```json
{
	"name": "Nome do cliente"
}
```

O envio real pelo SellFlux deve ser executado somente após confirmar o `templateId` e a autorização do disparo.

## Canais de envio

O projeto possui dois remetentes. O número remetente seleciona automaticamente o template correspondente:

- Reserva: `+5592982904431` -> template `2247586429353924`
- Principal: `+5592981799325` -> template `1086798570956908`

O número da cliente é o destinatário; ele não seleciona o template. O envio deve informar explicitamente qual remetente será usado.

## Identificação pelas conversas

Antes de consultar ou enviar um boleto, o fluxo deve:

1. Buscar as mensagens nos dois números configurados.
2. Analisar textos e imagens recebidas.
3. Usar OCR para extrair CPF de RG ou outro documento enviado em imagem.
4. Consultar o Asaas pelo CPF encontrado.
5. Tentar o nome completo quando ele estiver disponível.
6. Solicitar nome completo ou CPF quando não houver identificador.
7. Encaminhar para atendimento humano quando houver mais de um cadastro ou conflito.

A integração concreta de histórico de conversas e OCR deve implementar `ConversationSearch` e `ImageTextReader`. O contrato desses endpoints precisa ser confirmado com a API do canal antes de ligar o acesso real.

Para enviar, use `POST /boletos/send` com `confirm: true`, o identificador do cliente, o número destinatário e o número remetente. Sem essa confirmação, nenhum disparo é realizado.

## Observação

Este repositório deve conter apenas o que for relacionado ao projeto de boleto. O núcleo genérico da triagem financeira fica em outro repositório.
