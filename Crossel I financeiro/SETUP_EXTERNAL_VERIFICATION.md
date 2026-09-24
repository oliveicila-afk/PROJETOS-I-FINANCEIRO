# Configuração de Verificação Externa - Drive e SAC

Instruções para configurar acesso ao Google Drive e SellFlux SAC para validar demandas automaticamente.

## 📁 Google Drive - Configuração

### 1. Criar Service Account no Google Cloud

1. Vá para [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione um existente
3. Ative a API do Google Drive:
   - Vá para APIs & Services > Library
   - Procure por "Google Drive API"
   - Clique em "Enable"

### 2. Criar Chave de Serviço

1. Vá para APIs & Services > Credentials
2. Clique em "Create Credentials" > "Service Account"
3. Preencha os detalhes:
   - Service account name: `crossel-financeiro`
   - Service account ID: (preenchido automaticamente)
   - Click "Create and Continue"

### 3. Criar Chave JSON

1. Na página do Service Account criado
2. Vá para a aba "Keys"
3. Clique em "Add Key" > "Create new key"
4. Escolha JSON
5. O arquivo será baixado automaticamente

### 4. Extrair Valores para .env

Abra o JSON baixado e copie:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=seu_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Importante:** A chave privada deve incluir `\n` entre as linhas.

### 5. Compartilhar Pasta no Drive

1. Crie ou identifique a pasta raiz no Google Drive onde ficam os clientes
2. Clique com botão direito > "Share"
3. Cole o email do Service Account (`GOOGLE_SERVICE_ACCOUNT_EMAIL`)
4. Dê permissão de "Viewer"
5. Copie o ID da pasta da URL:
   - URL: `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j`
   - ID: `1a2b3c4d5e6f7g8h9i0j`

```bash
GOOGLE_DRIVE_ROOT_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j
```

### 6. Estrutura Esperada no Drive

A estrutura deve permitir buscar documentos por:
- **Nome do cliente**: pasta com nome do cliente
- **CPF/CNPJ**: pasta com identificação
- **Palavras-chave**: contracheque, extrato, comprovante

Exemplo:
```
📁 Clientes/
  📁 João Silva (CPF: 123.456.789-00)/
    📄 contracheque-2026-09.pdf
    📄 extrato-setembro.pdf
    📄 rg.pdf
  📁 Maria Santos (CPF: 987.654.321-00)/
    📄 contracheque-2026-09.pdf
    📄 extrato-julho-agosto-setembro.pdf
```

## 🔗 SellFlux SAC - Configuração

### 1. Obter Credenciais

Você já deve ter o `SELLFLUX_API_TOKEN_` configurado para outras partes do projeto.

Se não tiver:
1. Acesse a dashboard do SellFlux
2. Vá para Settings > API Keys
3. Copie seu token

```bash
SELLFLUX_API_TOKEN_=seu_token_aqui
SELLFLUX_SAC_API_URL=https://api-lb-sac.sellflux.app
```

### 2. Verificar Acesso ao SAC

O sistema buscará pelo endpoint `/sac/history` e `/sac/customer/summary`.

Se não existir, pode ser necessário:
- Verificar documentação do SellFlux
- Usar endpoints alternativos de histórico de conversas
- Adaptar a implementação

## ✅ Testando a Configuração

### Teste Local

```bash
# 1. Configure o .env com as variáveis
cp .env.example .env
# Edite .env com seus valores

# 2. Compile
npm run build

# 3. Teste com um cliente específico (simule)
node -e "
const { GoogleDriveClient } = require('./dist/src/integrations/google-drive-client.js');
const client = new GoogleDriveClient({
  serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  privateKey: process.env.GOOGLE_PRIVATE_KEY,
  rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
});
client.searchBankDocuments('João Silva').then(console.log).catch(console.error);
"
```

### Teste com CLI

```bash
# Revisar um caso específico com Drive e SAC
npm run cli -- verify-with-drive-sac 0001234-56.2026.8.11.0001 "João Silva" "+5511999999999"
```

## 🔄 Fluxo de Verificação Automática

1. Demanda chega com status "sem oportunidade"
2. Sistema busca documentos no Drive do cliente
3. Sistema busca histórico no SAC do SellFlux
4. Se encontrar indicadores de oportunidade:
   - Anexa documentos à tarefa no AdvBox
   - Encaminha para Fábio ou Leticia
   - Cria post/nota com evidências

## 🐛 Troubleshooting

### "Google Drive API error: 403 Forbidden"

**Causa:** Service Account não tem permissão na pasta

**Solução:**
1. Verifique se compartilhou a pasta corretamente
2. Tente compartilhar com permissão de "Editor" em vez de "Viewer"
3. Verifique o email do Service Account

### "SellFlux SAC API error: 404"

**Causa:** Endpoint do SAC pode estar em outra URL ou não existir

**Solução:**
1. Verifique a documentação do SellFlux
2. Tente endpoint alternativo: `/conversations`, `/messages`, `/support-tickets`
3. Adapte o código conforme necessário

## 📊 Monitoramento

Após a configuração:

1. **Verificar logs**: Verifique se as buscas no Drive estão funcionando
2. **Contar documentos**: Conte quantos documentos foram encontrados
3. **Analisar SAC**: Confirme que o histórico está sendo recuperado
4. **Testar encaminhamento**: Verifique se demandas estão sendo encaminhadas corretamente

## 🔐 Segurança

- ✅ Chave privada em `.env` (nunca commit)
- ✅ Service Account com permissões mínimas
- ✅ Tokens em GitHub Secrets para produção
- ✅ Acesso read-only ao Drive (não permite deletar/modificar)
- ✅ Logs com dados sanitizados (sem expor tokens)

## 📝 Próximos Passos

1. Configure Google Drive Service Account
2. Configure SellFlux SAC token
3. Teste localmente com CLI
4. Valide com um caso real
5. Configure notificações (email, Slack) para quando documentos forem anexados
