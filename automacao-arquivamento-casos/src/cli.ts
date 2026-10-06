import { getAdvBoxConfig, getAsaasConfig } from './config.js';
import { AdvBoxClient } from './integrations/advbox-client.js';
import { AsaasClient } from './integrations/asaas-client.js';
import { ArchivingService } from './domain/archiving-service.js';

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

  list-archiving-reasons
    Lista todos os motivos de arquivamento disponíveis

Variáveis de ambiente necessárias:
  - ADVBOX_TOKEN: Token de autenticação do Advbox
  - ADVBOX_API_URL: URL da API do Advbox (opcional)
  - ASAAS_API_KEY: Chave de API do Asaas
  - ASAAS_API_URL: URL da API do Asaas (opcional)
      `);
      return;
    }

    // Inicializar clientes
    const advboxConfig = getAdvBoxConfig();
    const asaasConfig = getAsaasConfig();
    const advboxClient = new AdvBoxClient(advboxConfig);
    const asaasClient = new AsaasClient(asaasConfig);
    const archivingService = new ArchivingService(advboxClient, asaasClient);

    if (command === 'collect-info' && args[0]) {
      const caseId = args[0];
      console.log(`\n📋 Coletando informações para caso: ${caseId}\n`);

      const info = await archivingService.collectArchivingInfo(caseId);

      console.log('\n=== INFORMAÇÕES COLETADAS ===\n');
      console.log(`Cliente: ${info.clientName}`);
      console.log(`CPF: ${info.clientCPF}`);
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

    if (command === 'create-protocol' && args[0]) {
      const caseId = args[0];
      console.log(`\n📄 Criando protocolo para caso: ${caseId}\n`);

      const info = await archivingService.collectArchivingInfo(caseId);
      const taskId = await archivingService.createArchivingProtocol(info);

      console.log(`\n✅ Protocolo criado com sucesso!`);
      console.log(`📌 ID da tarefa: ${taskId}`);
      console.log(`📍 Atribuído para: Gabi\n`);

      return;
    }

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
        return;
      }

      // 2. Criar protocolo
      const taskId = await archivingService.createArchivingProtocol(info);

      console.log(`\n✅ ARQUIVAMENTO PROCESSADO COM SUCESSO!\n`);
      console.log(`📌 Tarefa criada para Gabi: ${taskId}`);
      console.log(`📋 Informações do protocolo:`);
      console.log(`   - Cliente: ${info.clientName}`);
      console.log(`   - Processo: ${info.processNumber}`);
      console.log(`   - Motivo: ${info.archivingReason}\n`);

      return;
    }

    if (command === 'list-archiving-reasons') {
      const { ARCHIVING_REASONS } = await import('./domain/archiving-service.js');
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
    console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
