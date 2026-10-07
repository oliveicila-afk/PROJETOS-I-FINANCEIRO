# Rastreamento de Campo de Percentual de Honorários

## 📋 Status Atual

**Objetivo:** Extrair com precisão o campo "Percentual de honorários (%)" (% do escritório) de cada caso arquivado no AdvBox.

**Desafio:** O nome exato do campo na resposta da API do AdvBox é desconhecido. Diferentes versões da API ou diferentes tipos de casos podem usar nomes diferentes.

**Status:** ✅ Sistema robusto implementado para descoberta automática do nome do campo

## 🔍 Como Funciona o Sistema

### 1️⃣ Debug Script (`debug-api-fields.js`)

Propósito: Inspeccionar a estrutura real da resposta da API

Funcionalidade:
- Executa uma requisição GET para `/lawsuits?limit=1`
- Extrai o primeiro caso retornado
- Lista TODAS as chaves e valores do caso
- Procura especificamente por campos relacionados a percentual/honorários
- Salva a resposta completa em `/tmp/api_debug_first_lawsuit.json`

**Saída esperada:**
```
🔎 Searching for percentage-related fields:
✅ Found percentage-related fields:
  • fee_percentage: 20
  • honorarios_percentual: 19.97
```

Ou se nenhum campo for encontrado:
```
❌ No obvious percentage-related fields found in this lawsuit
```

### 2️⃣ Extraction Script (`retrieve-archived-cases.js`)

Propósito: Extrair os percentuais reais de todos os casos arquivados

Funcionalidade:
- Tenta localizar percentual em múltiplos nomes de campo (ordem de probabilidade):
  1. `fee_percentage` 
  2. `honorarios_percentual`
  3. `percentual_honorarios`
  4. `percentual`
  5. `percentage`
- Registra qual campo foi encontrado em cada caso
- Reporta estatísticas de detecção

**Saída esperada:**
```
📊 Percentage field detection:
✅ Found "fee_percentage" in 3000 cases
✅ Found "honorarios_percentual" in 45 cases
⚠️  55 cases missing percentage value
```

## 🚀 Como Usar

### Opção 1: Via GitHub Actions (Recomendado)

Melhor para descoberta inicial e validação em ambiente de produção.

**Passos:**
1. Abrir: https://github.com/seu-repo/actions
2. Procurar por: "Debug AdvBox API Fields"
3. Clicar em "Run workflow"
4. Aguardar conclusão (~30 segundos)
5. Fazer download do artefato `api-debug-results`
6. Abrir `/tmp/api_debug_first_lawsuit.json` no artefato

**O que fazer com o resultado:**
- Se encontrou campos de percentual: anotar os nomes exatos
- Se não encontrou: verificar se a API retornou dados válidos

### Opção 2: Execução Local (Requer token)

Melhor para testes rápidos durante desenvolvimento.

**Preparação:**
```bash
cd automacao-arquivamento-casos
export ADVBOX_TOKEN="seu_token_aqui"
```

**Executar debug:**
```bash
node debug-api-fields.js
```

**Executar extração completa:**
```bash
node retrieve-archived-cases.js
```

## 📊 Interpretando os Resultados

### Cenário 1: Campo Descoberto ✅

Se o debug script encontrar `fee_percentage: 20`:
```json
{
  "id": "case123",
  "fee_percentage": 20,
  "honorarios_percentual": null,
  ...
}
```

**Ação:** Campo correto é `fee_percentage`. Sistema já está configurado corretamente.

### Cenário 2: Campo Alternativo Descoberto ✅

Se encontrar `honorarios_percentual: 19.97`:
```json
{
  "id": "case123",
  "fee_percentage": null,
  "honorarios_percentual": 19.97,
  ...
}
```

**Ação:** Campo correto é `honorarios_percentual`. Sistema já usa este como fallback.

### Cenário 3: Nome Inesperado ⚠️

Se encontrar um campo com nome diferente (ex: `escritorio_pct`):
```json
{
  "id": "case123",
  "escritorio_pct": 20,
  ...
}
```

**Ação:** 
1. Notar o nome exato: `escritorio_pct`
2. Abrir `retrieve-archived-cases.js`
3. Localizar linha com fallback de campos:
```javascript
else if (caseItem.escritorio_pct !== undefined) {
  feePercentage = caseItem.escritorio_pct;
  percentageFieldsFound.add('escritorio_pct');
}
```
4. Adicionar nova condição no meio das outras

### Cenário 4: Nenhum Campo Encontrado ❌

Se nenhum campo de percentual for encontrado:
```
⚠️  No obvious percentage-related fields found in this lawsuit
```

**Ação:**
1. Verificar se a resposta da API contém dados reais
2. Verificar se o caso está realmente arquivado
3. Contactar suporte AdvBox para confirmar nome do campo de percentual
4. Se API não retorna percentual: verificar se precisa de outro endpoint

## 🔄 Rounding Behavior (Importante!)

**Conhecimento crítico do usuário:**
- UI AdvBox exibe percentuais como números inteiros (20%)
- API pode retornar valores decimais (19.97%)
- O arredondamento é feito apenas para exibição

**Implicações:**
- Valores armazenados: manter com precisão decimal
- Validação: aceitar valores 0-100 com até 2 casas decimais
- Arquivamento posterior: pode precisar de precisão decimal

## 📈 Próximas Etapas

### Curto Prazo
- [ ] Executar debug script via GitHub Actions
- [ ] Confirmar nome correto do campo de percentual
- [ ] Validar que percentuais estão sendo extraídos corretamente
- [ ] Verificar rounding behavior em casos reais

### Médio Prazo
- [ ] Integrar percentuais no protocolo de arquivamento
- [ ] Validar percentuais antes de arquivamento
- [ ] Adicionar alertas para percentuais fora do range esperado

### Longo Prazo
- [ ] Dashboard com distribuição de percentuais
- [ ] Relatório de anomalias de percentual
- [ ] Validação de percentuais contra contrato

## 🔧 Troubleshooting

### "ADVBOX_TOKEN not set"
Solução: Configure o token em GitHub Secrets ou variável de ambiente local

### "No lawsuits returned"
Verificações:
- Token é válido?
- Existem casos arquivados na sua conta AdvBox?
- Data do filtro `exit_execution_end` está correta?

### "Field detection shows 0 cases"
Verificação:
- API está retornando dados válidos?
- Casos retornados têm estrutura esperada?
- Token tem permissão para acessar dados de casos?

### "Percentuais parecem errados"
Verificação:
- Valores estão em range 0-100?
- Decimais estão sendo capturados corretamente?
- UI está arredondando, mas API retorna decimais?

## 📚 Referências

- Script de Debug: `automacao-arquivamento-casos/debug-api-fields.js`
- Script Principal: `automacao-arquivamento-casos/retrieve-archived-cases.js`
- Workflow: `.github/workflows/debug-api-fields.yml`
- Documentação: `automacao-arquivamento-casos/ARCHITECTURE.md`

## 💡 Dica Final

Se tiver dúvidas sobre qual campo usar, sempre execute o debug script primeiro. Ele mostra a verdade da API em tempo real e elimina conjecturas.

