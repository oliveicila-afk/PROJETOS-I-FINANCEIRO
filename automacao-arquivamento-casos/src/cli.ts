import { getAdvBoxConfig, getAsaasConfig } from './config.js';
import { ArchivingAdapter } from './integrations/archiving-adapter.js';
import { ArchivingService, ARCHIVING_REASONS } from './domain/archiving-service.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  return { command, args: args.slice(1) };
}

async function main() {
  try {
    const { command, args } = parseArgs();

    if (!command) {
      console.log(`
🏛️  Automação de Arquivamento de Casos - CLI

Uso: npm run cli -- <comando> [opções]

Comandos:
  collect-info <id-caso>
    Coleta informações de arquivamento para um caso
    Exemplo: npm run cli -- collect-info CASO123

  create-protocol <id-caso>
    Cria protocolo de arquivamento e tarefa para Gabi
    Exemplo: npm run cli -- create-protocol CASO123

  process-archiving <id-caso>
    Fluxo completo: coleta info + cria protocolo
    Exemplo: npm run cli -- process-archiving CASO123

  validate-connection
    Testa conectividade com Advbox e Asaas

  list-archiving-reasons
    Lista todos os motivos de arquivamento disponíveis

Variáveis de ambiente necessárias:
  - ADVBOX_TOKEN: Token de autenticação do Advbox
  - ASAAS_API_KEY: Chave de API do Asaas

Opcionais:
  - ADVBOX_API_URL: URL da API do Advbox
  - ASAAS_API_URL: URL da API do Asaas
      `);
      return;
    }

    // Inicializar dependências
    let advboxConfig, asaasConfig;
    try {
      advboxConfig = getAdvBoxConfig();
      asaasConfig = getAsaasConfig();
    } catch (error) {
      console.error(`❌ Erro de configuração: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`\n📝 Verifique o arquivo .env (copie de .env.example e preencha as credenciais)`);
      process.exit(1);
    }

    const adapter = new ArchivingAdapter(advboxConfig, asaasConfig);
    const archivingService = new ArchivingService(adapter);

    // === VALIDATE CONNECTION ===
    if (command === 'validate-connection') {
      console.log(`\n🔗 Validando conectividade...\n`);
      const isConnected = await adapter.validateConnectivity();

      if (isConnected) {
        console.log(`\n✅ Todas as conexões OK. Sistema pronto para usar.\n`);
        return;
      } else {
        console.error(`\n❌ Falha na conectividade. Verifique suas credenciais.\n`);
        process.exit(1);
      }
    }

    // === COLLECT INFO ===
    if (command === 'collect-info' && args[0]) {
      const caseId = args[0];
      console.log(`\n📋 Coletando informações para caso: ${caseId}\n`);

      const info = await archivingService.collectArchivingInfo(caseId);

      console.log('\n=== INFORMAÇÕES COLETADAS ===\n');
      console.log(`Cliente: ${info.clientName}`);
      console.log(`CPF: ${info.clientCPF.replace(/\d(?=\d{3})/g, '*')}`); // Mascarado
      console.log(`Número do processo: ${info.processNumber || 'Não encontrado'}`);
      console.log(`Motivo: ${info.archivingReason}`);
      console.log(`Múltiplas ações: ${info.hasMultipleActions ? 'SIM ⚠️' : 'Não'}`);
      console.log(`\n💰 Valores:\n`);
      console.log(`  Êxito: R$ ${info.successValue || 0}`);
      console.log(`  Sucumbencial: R$ ${info.sucumbencialValue || 0}`);

      if (info.alerts.length > 0) {
        console.log(`\n⚠️  ALERTAS:\n`);
        info.alerts.forEach(alert => console.log(`  ${alert}`));
      }

      return;
    }

    // === CREATE PROTOCOL ===
    if (command === 'create-protocol' && args[0]) {
      const caseId = args[0];
      console.log(`\n📄 Criando protocolo para caso: ${caseId}\n`);

      const info = await archivingService.collectArchivingInfo(caseId);
      const taskId = await archivingService.createArchivingProtocol(info);

      console.log(`\n✅ Protocolo criado com sucesso!`);
      console.log(`📌 ID da tarefa: ${taskId}`);
      console.log(`📍 Atribuído para: Gabriele Nascimento\n`);

      return;
    }

    // === PROCESS ARCHIVING ===
    if (command === 'process-archiving' && args[0]) {
      const caseId = args[0];
      console.log(`\n🔄 Processando arquivamento completo para caso: ${caseId}\n`);

      // 1. Coletar informações
      const info = await archivingService.collectArchivingInfo(caseId);

      console.log('\n📊 RESUMO DAS INFORMAÇÕES:\n');
      console.log(`Cliente: ${info.clientName}`);
      console.log(`Processo: ${info.processNumber || 'Não localizado'}`);
      console.log(`Motivo: ${info.archivingReason}`);
      console.log(`Total de honorários: R$ ${(info.successValue || 0) + (info.sucumbencialValue || 0)}`);

      if (info.alerts.length > 0) {
        console.log(`\n⚠️  ATENÇÃO - ALERTAS ENCONTRADOS:\n`);
        info.alerts.forEach(alert => console.log(`  ${alert}`));
        console.log(`\n⏸️  OPERAÇÃO PAUSADA - Resolva os alertas acima antes de continuar.\n`);
        process.exit(1);
      }

      // 2. Criar protocolo
      const taskId = await archivingService.createArchivingProtocol(info);

      console.log(`\n✅ ARQUIVAMENTO PROCESSADO COM SUCESSO!\n`);
      console.log(`📌 Tarefa criada para Gabriele Nascimento: ${taskId}`);
      console.log(`📋 Informações do protocolo:`);
      console.log(`   - Cliente: ${info.clientName}`);
      console.log(`   - Processo: ${info.processNumber}`);
      console.log(`   - Motivo: ${info.archivingReason}\n`);

      return;
    }

    // === LIST ARCHIVING REASONS ===
    if (command === 'list-archiving-reasons') {
      console.log('\n📋 Motivos de Arquivamento Disponíveis:\n');

      ARCHIVING_REASONS.forEach((reason, index) => {
        console.log(`${index + 1}. ${reason.label} (${reason.code})`);
        console.log(`   ${reason.description}\n`);
      });

      return;
    }

    console.error(`❌ Comando desconhecido: ${command}`);
    process.exit(1);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      // Erro formatado do adapter
      const err = error as { code: string; message: string; details?: string };
      console.error(`\n❌ Erro [${err.code}]: ${err.message}`);
      if (err.details) {
        console.error(`📝 Detalhes: ${err.details}`);
      }
    } else {
      console.error(`\n❌ Erro: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
  }
}

main();
