# Sistema de Diagnóstico Automático de Erros

## Visão Geral

O sistema de diagnóstico automático investiga erros que ocorrem durante a automação de arquivamento, tenta resolver automaticamente e gera um relatório detalhado para enviar por email.

## Arquitetura

### Componentes

1. **ErrorDiagnostics** (`src/utils/error-diagnostics.ts`)
   - Analisa erros HTTP e identifica causa raiz
   - Diferencia entre: token inválido, endpoint errado, conectividade, permissão, etc
   - Gera diagnóstico com sugestão de resolução

2. **DiagnosticReport** (`src/domain/diagnostic-report.ts`)
   - Estrutura de relatório que inclui diagnóstico
   - Gera relatório em HTML (para email) e texto (para logs)
   - Inclui: cliente, processo, problemas, soluções, resultado final

3. **ArchivingWithDiagnostics** (`src/services/archiving-with-diagnostics.ts`)
   - Wrapper que executa o arquivamento com captura de diagnóstico
   - Tenta resolver problemas automaticamente
   - Envia relatório por email se configurado

## Fluxo de Execução

```
Iniciar Arquivamento
         ↓
    Tentar Executar
         ↓
   Erro Ocorre?
   /          \
  Não        Sim
  ↓           ↓
 Sucesso   Diagnosticar
           Problema
              ↓
         Resolver
         Automaticamente?
         /          \
        Não         Sim
         ↓           ↓
      Falha     Tentar Resolver
         ↓           ↓
   Gerar      Conseguiu?
   Relatório   /       \
      ↓      Sim       Não
      ↓       ↓         ↓
   Email   Sucesso   Falha
              ↓         ↓
            Gerar      Gerar
            Relatório  Relatório
               ↓          ↓
             Email      Email
```

## Exemplos de Diagnóstico

### 1. HTTP 401 - Endpoint Errado

**Problema Detectado:**
```
HTTP 401: Unauthorized
```

**Diagnóstico:**
```
Endpoint incorreto: /cases não existe na API Advbox.
O Advbox diferencia entre /cases e /lawsuits.
Para acessar um caso, use /lawsuits/{id}.
```

**Resolução:**
```
Substituir endpoint de /cases para /lawsuits
```

**Resultado no Email:**
```
⚠️ Problema: HTTP 401: Unauthorized
🔍 Diagnóstico: Endpoint incorreto: /cases não existe na API Advbox...
💡 Resolução: Substituir endpoint de /cases para /lawsuits
✅ Tentativa: SUCESSO
```

### 2. Timeout de Conexão

**Problema Detectado:**
```
ETIMEDOUT: connection timed out
```

**Diagnóstico:**
```
Timeout ou DNS não resolvido. Problema de rede ou servidor indisponível.
```

**Resolução:**
```
Aguardar e fazer retry automático
```

### 3. Token Inválido

**Problema Detectado:**
```
HTTP 401: Unauthorized (sem endpoint específico)
```

**Diagnóstico:**
```
Token pode estar inválido, expirado ou não autorizado para este recurso.
Ou o caso está em um workspace diferente.
```

**Resolução:**
```
Validar token e workspace do caso
```

## Usando o Sistema

### Implementação Básica

```typescript
import { ArchivingWithDiagnostics } from './services/archiving-with-diagnostics.js';

const diagnosticsService = new ArchivingWithDiagnostics({
  enableAutoResolution: true,
  enableEmailReport: true,
  emailAddress: 'financeiro@calandrini.com.br',
});

const result = await diagnosticsService.executeWithDiagnostics(
  'exec-' + Date.now(), // executionId
  '28231052',           // caseId
  'João Silva',         // clientName
  '12345678900',        // clientCPF
  '0000001-00.0000.0.00.0000', // processNumber
  async () => {
    // Sua lógica de arquivamento aqui
    const archivingService = new ArchivingService(adapter);
    const info = await archivingService.collectArchivingInfo('28231052');
    const taskId = await archivingService.createArchivingProtocol(info);
    
    return {
      result: info,
      taskId: taskId,
      protocolContent: info.observations.join('\n'),
    };
  }
);

if (result.success) {
  console.log('✅ Arquivamento concluído com sucesso');
  console.log(result.report.generateTextReport());
} else {
  console.log('❌ Arquivamento falhou');
  console.log(result.report.generateTextReport());
}
```

### Relatório para Email

```typescript
// Gerar HTML para enviar por email
const htmlReport = result.report.generateEmailReport();

// Gerar texto simples para logging
const textReport = result.report.generateTextReport();

// Obter dados estruturados
const data = result.report.getData();
console.log(`Status: ${data.status}`); // 'success' | 'success_with_warnings' | 'failed'
console.log(`Diagnostics: ${data.diagnostics.length}`);
console.log(`Warnings: ${data.warnings.length}`);
```

## Estrutura do Relatório

### HTML (para Email)

O relatório HTML inclui:
- Status com emoji (✅ Sucesso / ⚠️ Avisos / ❌ Falha)
- Informações do caso (ID, cliente, CPF mascarado, processo)
- Diagnósticos com problema, diagnóstico, resolução e resultado
- Avisos (em caixa amarela)
- Erros (em caixa vermelha)
- Resultado final (se tarefa foi criada)
- Timestamp de execução

### Texto (para Logs)

Formato simples para logging em arquivo ou console:
```
RELATÓRIO DE AUTOMAÇÃO DE ARQUIVAMENTO
=====================================

Status: ✅ SUCESSO
Data/Hora: 09/10/2026 17:30:45
Duração: 2345ms
Execução ID: exec-1728512445000

INFORMAÇÕES DO CASO
------------------
ID do Caso: 28231052
Cliente: João Silva
CPF: ***678900
Número do Processo: 0000001-00.0000.0.00.0000

[Diagnósticos, Avisos, Erros, etc...]

RESULTADO
---------
✅ Tarefa criada com sucesso!
ID da Tarefa: task-123456
```

## Estratégias de Auto-Resolução

O sistema tenta as seguintes estratégias automaticamente:

### 1. Endpoint Errado → Tentar Alternativa

Se diagnóstico sugere `/cases` errado:
- Tenta com `/lawsuits` automaticamente
- Registra sucesso/falha no relatório

### 2. Token Inválido → Validar

Se diagnóstico sugere token problema:
- Valida token contra API
- Registra status de validação

### 3. Erro Temporário → Retry

Se diagnóstico é timeout/servidor down:
- Aguarda e tenta novamente
- Usa backoff exponencial

## Integração com Email

Para enviar relatório por email, implemente a função `sendReportByEmail`:

```typescript
private async sendReportByEmail(report: DiagnosticReport): Promise<void> {
  const data = report.getData();
  const htmlContent = report.generateEmailReport();
  
  // Exemplo com Nodemailer
  await transporter.sendMail({
    from: 'automacao@calandrini.com.br',
    to: this.config.emailAddress,
    subject: `Relatório de Arquivamento - ${data.clientName} (${data.status})`,
    html: htmlContent,
  });
}
```

## Informações no Email

O email incluirá:
- ✅/⚠️/❌ Status
- 📋 Informações do caso
- 🔍 Diagnósticos (se houver problemas)
- ⚠️ Avisos (se houver)
- ❌ Erros (se falhou)
- ✅ Resultado (se tarefa criada)

## Exemplo de Relatório por Email

```
============================
✅ SUCESSO COM AVISOS
============================

📋 Informações do Caso:
- ID: 28231052
- Cliente: João Silva
- CPF: ***678900
- Processo: 0000001-00.0000.0.00.0000

🔍 Diagnósticos:
1. ⚠️ Problema: HTTP 401: Unauthorized
   Diagnóstico: Endpoint incorreto: /cases não existe...
   Resolução: Substituir endpoint de /cases para /lawsuits
   ✅ Tentativa: SUCESSO

⚠️ Avisos:
- Número do processo não encontrado no Asaas
- Cliente possui outras ações em andamento

✅ Resultado:
Tarefa criada com sucesso!
ID: task-123456

============================
Data: 09/10/2026 17:30:45
============================
```

## Testes

```bash
# Testar diagnóstico de erro 401
npm test -- --testNamePattern="diagnose auth error"

# Testar relatório HTML
npm test -- --testNamePattern="generate email report"

# Testar auto-resolução
npm test -- --testNamePattern="try alternative strategies"
```

## Próximos Passos

1. ✅ Implementar diagnóstico automático
2. ✅ Implementar relatório com diagnóstico
3. ⏳ Implementar envio de email
4. ⏳ Implementar auto-resolução completa
5. ⏳ Adicionar testes unitários
6. ⏳ Integrar com archiving-automation-with-alerts.ts

## Referências

- `src/utils/error-diagnostics.ts` - Lógica de diagnóstico
- `src/domain/diagnostic-report.ts` - Estrutura de relatório
- `src/services/archiving-with-diagnostics.ts` - Serviço de diagnóstico
- `docs/TESTE_WORKFLOW_CORRIGIDO.md` - Teste de validação (onde isso será usado)
