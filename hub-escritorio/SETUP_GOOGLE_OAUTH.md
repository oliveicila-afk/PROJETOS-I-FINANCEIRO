# Configurar Google OAuth no Streamlit Cloud

## 1. Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Clique no seletor de projetos no topo (ao lado de "Google Cloud")
3. Clique em **"Novo Projeto"**
4. Nome: `Hub Calandrini OAuth`
5. Clique em **"Criar"**
6. Aguarde o projeto ser criado (pode levar 1-2 minutos)

## 2. Habilitar Google+ API

1. No console, procure por **"OAuth consent screen"** na barra de busca
2. Clique em **"OAuth consent screen"** (Tela de consentimento OAuth)
3. Escolha **"Externo"** como tipo de usuário
4. Clique em **"Criar"**
5. Preencha:
   - **App name**: `Hub Financeiro Calandrini`
   - **User support email**: `oliveicila@gmail.com`
   - **Developer contact**: `oliveicila@gmail.com`
6. Clique em **"Salvar e continuar"**
7. Deixe "Scopes" como está (padrão) e clique **"Salvar e continuar"**
8. Clique **"Salvar e continuar"** novamente

## 3. Criar Credenciais OAuth

1. No menu esquerdo, clique em **"Credenciais"**
2. Clique em **"+ Criar Credenciais"** no topo
3. Escolha **"ID do Cliente OAuth"**
4. Selecione **"Aplicação da Web"**
5. Preencha:
   - **Nome**: `Streamlit Hub`
   - **URIs JavaScript autorizados**: Deixe em branco por enquanto
   - **URIs de redirecionamento autorizados**: Adicione a URL do seu app Streamlit
     - Ex: `https://projetos-i-financeiro-hdsnguqqc2z4lwmmvbalwc.streamlit.app`
     - Adicione também: `http://localhost:8501`
6. Clique em **"Criar"**

## 4. Baixar JSON de Credenciais

1. A janela mostrará seu **Client ID** e **Client Secret**
2. Clique no ícone de download (seta para baixo) na linha da credencial
3. Renomeie o arquivo baixado para `google_credentials.json`

## 5. Configurar Secrets no Streamlit Cloud

1. Acesse sua app em [Streamlit Cloud](https://share.streamlit.io)
2. Clique em **⋮** (três pontos) → **Settings**
3. Vá para aba **"Secrets"**
4. Clique em **"Edit secrets"**
5. Cole este template:

```
GOOGLE_OAUTH_COOKIE_KEY="seu-valor-aleatorio-muito-longo-aqui-minimo-32-caracteres"
google_oauth_credentials={
  "web": {
    "client_id": "SEU_CLIENT_ID_AQUI",
    "project_id": "seu-projeto",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "SEU_CLIENT_SECRET_AQUI",
    "redirect_uris": [
      "http://localhost:8501",
      "https://SEU-APP.streamlit.app"
    ]
  }
}
```

6. Substitua:
   - `SEU_CLIENT_ID_AQUI` com seu Client ID do Google
   - `SEU_CLIENT_SECRET_AQUI` com seu Client Secret
   - `https://SEU-APP.streamlit.app` com sua URL real

7. Para `GOOGLE_OAUTH_COOKIE_KEY`, gere uma chave aleatória forte:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

8. Clique em **"Save"**

## 6. Arquivo google_credentials.json (Local Development)

Para testar localmente, crie um arquivo `google_credentials.json` na pasta `hub-escritorio/` com o mesmo conteúdo das secrets. Este arquivo está no `.gitignore` e não será commitado.

## 7. Testar

1. Aguarde 1-2 minutos pelo redeploy
2. Acesse sua app
3. Clique em **"Continuar com Google"** na tela de login
4. Você será redirecionado para autenticação Google
5. Após autenticar, voltará para o app

## Troubleshooting

**"Billing account not open"**: Normalmente é erro do Google Cloud. Solução:
1. Vá para [Billing](https://console.cloud.google.com/billing) no Google Cloud
2. Ative uma conta de faturamento (pode usar avaliação gratuita)
3. Tente novamente

**Erro de redirect_uri**: Certifique-se que a URL configurada em Google Cloud Console é exatamente igual à da app Streamlit.

**Button aparece desabilitado**: As secrets ainda não foram carregadas. Aguarde 1-2 minutos e recarregue.
