# Implantacao no Google Cloud Run

## Antes de publicar

1. Crie um projeto no Google Cloud e habilite Cloud Run, Cloud Build, Artifact Registry, Secret Manager e Cloud SQL Admin.
2. Instale a Google Cloud CLI e autentique: `gcloud auth login`.
3. Crie um banco PostgreSQL no Cloud SQL. Nao use SQLite em producao: o disco do Cloud Run e temporario e cada instancia possui seu proprio arquivo.
4. No Secret Manager, crie segredos para as chaves do `.env` e para o arquivo `google_credentials.json`.

## Primeira implantacao

Defina valores reais no PowerShell:

```powershell
$PROJECT_ID = "seu-projeto"
$REGION = "southamerica-east1"
$SERVICE = "hub-escritorio"
gcloud config set project $PROJECT_ID
gcloud run deploy $SERVICE --source . --region $REGION --allow-unauthenticated --port 8080
```

Copie a URL HTTPS retornada. No Google Cloud Console, inclua essa URL em **URIs de redirecionamento autorizados** do cliente OAuth Web.

## Configuracao segura

Monte o JSON OAuth como arquivo e forneca segredos por variaveis de ambiente. Exemplo de atualizacao, substituindo os nomes dos segredos e a URL final:

```powershell
gcloud run services update $SERVICE --region $REGION `
  --update-secrets /secrets/google_credentials.json=google-oauth-credentials:latest,ADMIN_EMAIL=hub-admin-email:latest,AUTHORIZED_EMAILS=hub-authorized-emails:latest,APP_ACCESS_PASSWORD=hub-access-password:latest,GOOGLE_OAUTH_COOKIE_KEY=hub-oauth-cookie-key:latest,ASAAS_API_KEY=hub-asaas-key:latest `
  --set-env-vars GOOGLE_OAUTH_CREDENTIALS_PATH=/secrets/google_credentials.json,GOOGLE_OAUTH_REDIRECT_URI=https://SUA_URL_DO_CLOUD_RUN
```

Para PostgreSQL via Cloud SQL, configure `DATABASE_URL` como segredo e conecte a instancia Cloud SQL ao servico. Formato esperado:

```text
postgresql+psycopg2://USUARIO:SENHA@/BANCO?host=/cloudsql/PROJETO:REGIAO:INSTANCIA
```

## Validacao

1. Abra a URL HTTPS gerada pelo Cloud Run.
2. Entre com um e-mail em `ADMIN_EMAIL` ou `AUTHORIZED_EMAILS`.
3. Confirme que o callback OAuth retorna para a URL publica.
4. Crie um lancamento de teste e confirme sua persistencia no Cloud SQL.

## Seguranca

- Nunca envie `.env` ou `google_credentials.json` para Git, imagem Docker ou repositorio.
- Restrinja IAM de Secret Manager e Cloud SQL aos operadores necessarios.
- Mantenha `--allow-unauthenticated`: o acesso ao site precisa ser publico para o redirecionamento OAuth; a autorizacao de usuarios continua sendo feita pelo Google e pela lista de e-mails.