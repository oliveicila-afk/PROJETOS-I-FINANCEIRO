# Quick Start: Descobrir Campo de Percentual

## ⚡ Modo Rápido (Recomendado)

**Tempo estimado: 1-2 minutos**

### Passo 1: Executar Debug Script via GitHub Actions

1. Abra: https://github.com/seu-usuario/seu-repo/actions
2. Procure por: **"Debug AdvBox API Fields"**
3. Clique em **"Run workflow"** 
4. Aguarde a conclusão (o workflow mostrará output em tempo real)

### Passo 2: Verificar Saída no Log

Na aba "Run workflow", você verá algo assim:

**✅ Se encontrou campos de percentual:**
```
📦 Full Response Structure:
{
  "data": [
    {
      "id": "case_123",
      "process_number": "0001234567-89.2024.8.26.0100",
      "responsible": "João Silva",
      "fee_percentage": 20,
      ...
    }
  ]
}

🎯 First Lawsuit Keys and Values:
─────────────────────────────────────────
  fee_percentage                 : 20
  honorarios_percentual          : null
  percentual                     : null
  ...

🔎 Searching for percentage-related fields:
✅ Found percentage-related fields:
  • fee_percentage: 20
```

**❌ Se não encontrou:**
```
❌ No obvious percentage-related fields found in this lawsuit
```

### Passo 3: Baixar Arquivo Completo (Opcional)

1. Vá para "Artifacts" no final da página do workflow
2. Baixe: `api-debug-results`
3. Abra: `api_debug_first_lawsuit.json` em um editor
4. Procure por campos similares a: `percentual`, `honorario`, `fee`, `pct`

### Passo 4: Verificar Script Principal

Após descobrir o campo:

1. Abra: `automacao-arquivamento-casos/retrieve-archived-cases.js`
2. Procure pela linha:
```javascript
let feePercentage = 0;
if (caseItem.fee_percentage !== undefined) {
```

3. Confirme que o campo descoberto está listado como um dos fallbacks

## 🎯 Interpretação Rápida

| O que você encontrou | O que fazer |
|---|---|
| `fee_percentage: 20` | ✅ Sem ação necessária (já configurado) |
| `honorarios_percentual: 19.97` | ✅ Sem ação necessária (está no fallback) |
| `percentual_honorarios: 20` | ✅ Sem ação necessária (está no fallback) |
| Outro campo (ex: `pct_escritorio: 20`) | ⚠️ Contactar (precisa atualizar script) |
| Nenhum campo de percentual | ⚠️ Contactar (possível issue com API) |

## 📱 Modo Local (Para Desenvolvedores)

Se preferir testar localmente:

```bash
# 1. Configure o token
export ADVBOX_TOKEN="seu_token_aqui"

# 2. Entre na pasta
cd automacao-arquivamento-casos

# 3. Rode o debug script
node debug-api-fields.js

# 4. Verá output semelhante ao workflow
```

## 🔗 Próximo Passo

Após descobrir o campo:

1. Leia: `PERCENTAGE_FIELD_TRACKING.md` para detalhes completos
2. Execute: `retrieve-archived-cases.js` para extrair todos os percentuais
3. Valide: Confirme que percentuais fazem sentido (0-100%)

## 💬 Suporte

Caso tenha dúvidas:
1. Verifique: `ARCHITECTURE.md` (seção "Campos de Percentual")
2. Consulte: `PERCENTAGE_FIELD_TRACKING.md` (troubleshooting)

---

**Lembre-se:** O debug script mostra a verdade da API em tempo real. Não é conjectura!

