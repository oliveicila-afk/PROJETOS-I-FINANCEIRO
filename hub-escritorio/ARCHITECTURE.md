# Arquitetura do Hub de Gestao

## Diagnostico e objetivo

O escritorio precisa centralizar previsoes de exito e acompanhamento financeiro sem acoplar a interface as APIs externas. O objetivo deste MVP e permitir acesso controlado, registro persistente de previsoes e consulta isolada de dados do Asaas.

Indicadores iniciais: lancamentos salvos sem erro no banco local e consultas externas que nao exponham credenciais na interface ou nos logs.

## Processo

Hoje, as previsoes e as conciliacoes dependem de ferramentas separadas. Com o hub, o usuario autorizado registra uma previsao; o aplicativo grava os dados no banco; e a tela de contadoria consulta pagamentos do Asaas por meio de um adaptador isolado. O ADVBOX permanecera desacoplado ate que seus endpoints e contrato de autenticacao sejam confirmados.

| Etapa | R | A | C | I |
| --- | --- | --- | --- | --- |
| Configurar credenciais | Administrador do escritorio | Administrador do escritorio | TI | Financeiro |
| Registrar previsao | Comercial/financeiro autorizado | Gestor financeiro | Contadoria | Administrador |
| Consultar conciliacao | Contadoria | Gestor financeiro | TI | Comercial |

Controles: acesso principal via Google OAuth limitado ao e-mail autorizado; a senha de ambiente e apenas contingencia local; lancamentos exigem processo e tese; as credenciais sao lidas somente de `.env`.

## Tecnologia e entregaveis

- Streamlit para a interface local.
- SQLite via SQLAlchemy para persistencia local.
- `requests` para adaptadores de API.
- `src/integracoes/advbox_asaas.py` como fronteira unica para Asaas e futura integracao ADVBOX.

Entregues neste MVP: painel Streamlit, controle de acesso via Google OAuth, cadastro e listagem de previsoes, banco SQLite e consulta paginada de pagamentos Asaas. O projeto possui empacotamento para Cloud Run, mas a producao depende de configurar Secret Manager, URL OAuth publica e Cloud SQL. Nao entregue: envio de lancamentos ao ADVBOX, webhooks ou sincronizacao bidirecional.

## Criterios de aceitacao

1. `python -m py_compile src/app.py src/database.py src/integracoes/advbox_asaas.py` termina com codigo zero.
2. O projeto possui `requirements.txt`, `.env.example`, `.gitignore`, `src/app.py`, `src/database.py` e `src/integracoes/advbox_asaas.py`.
3. Um lancamento valido e persistido no SQLite e aparece na tabela da interface.
4. Sem `ASAAS_API_KEY`, a tela de contadoria informa a configuracao ausente sem encerrar o aplicativo.
5. Arquivos de segredo (`.env` e `*.db`) sao ignorados pelo Git.

## Riscos e mitigacoes

| Risco | Mitigacao |
| --- | --- |
| Credencial exposa no repositorio | `.env.example` sem valores reais, `.gitignore` para `.env` e `google_credentials.json`. |
| Identidade nao verificada | Google OAuth valida identidade via conta Google autorizada; cookies com expiração de 30 dias. |
| API ADVBOX sem contrato confirmado | Manter metodo explicitamente indisponivel ate documentacao oficial. |
| Falha ou indisponibilidade Asaas | Timeout, erros tratados e mensagem sem dados sensiveis. |
| Dados locais perdidos | Definir backup do arquivo SQLite antes de uso operacional. |
| SQLite em Cloud Run | Migrar para Cloud SQL PostgreSQL antes de dados compartilhados ou producao. |

## Validacao e evolucao

O piloto deve usar dados nao sensiveis. Validar lancamento valido, campos obrigatorios ausentes, senha local invalida, login Google com e-mail autorizado e ausencia de chave Asaas. Antes de operar em producao, revisar a lista de e-mails autorizados, a politica de cookies e confirmar os endpoints ADVBOX.