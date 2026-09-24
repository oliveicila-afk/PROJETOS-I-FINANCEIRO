# Hub de Gestao

Painel local para previsoes de exito, provisao e consulta de pagamentos Asaas.

## Execucao local

1. Instale Python 3.11 ou superior e marque a opcao para adiciona-lo ao `PATH`.
2. Crie o ambiente virtual: `python -m venv .venv`.
3. Ative no PowerShell: `.\.venv\Scripts\Activate.ps1`.
4. Instale dependencias: `python -m pip install -r requirements.txt`.
5. No Google Cloud Console, crie uma credencial OAuth do tipo Aplicativo da Web e cadastre `http://localhost:8501` como URI de redirecionamento.
6. Salve o JSON baixado como `google_credentials.json` na raiz do projeto. Esse arquivo ja esta ignorado pelo Git.
7. Edite `.env`, definindo `ADMIN_EMAIL`, `AUTHORIZED_EMAILS`, `APP_ACCESS_PASSWORD` e `GOOGLE_OAUTH_COOKIE_KEY`. Use virgulas para separar os e-mails adicionais autorizados. Quando aplicavel, informe tambem `ASAAS_API_KEY`.
8. Inicie: `streamlit run src/app.py`.

O banco SQLite e criado automaticamente como `hub_escritorio.db` na raiz. O login Google permite os e-mails definidos em `ADMIN_EMAIL` e `AUTHORIZED_EMAILS`; a senha local permanece como contingencia. O adaptador Asaas segue o contrato da integracao anterior. A integracao ADVBOX esta isolada em `src/integracoes/advbox_asaas.py`, mas nao realiza lancamentos ate que o endpoint e o modelo de autenticacao sejam confirmados.

## Publicacao

O projeto esta preparado para Google Cloud Run. Siga [DEPLOY_CLOUD_RUN.md](DEPLOY_CLOUD_RUN.md). Para dados compartilhados, configure Cloud SQL PostgreSQL; SQLite e apropriado apenas para o uso local atual.