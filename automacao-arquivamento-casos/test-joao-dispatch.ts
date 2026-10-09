import { ArchivingAutomationWithAlerts } from './src/domain/archiving-automation-with-alerts.js';

async function testDispatch() {
  console.log('🚀 Iniciando disparo com João Silva...\n');

  const automationService = new ArchivingAutomationWithAlerts({
    enableDiagnostics: true,
    diagnosticsConfig: {
      enableAutoResolution: true,
      enableEmailReport: true,
      emailAddress: 'financeiro@calandrini.com.br',
    },
  });

  try {
    const result = await automationService.processArchivingCaseWithRetry({
      lawsuitId: '28231052',
      processNumber: '0000001-00.0000.0.00.0000',
      clientName: 'João Silva',
    });

    console.log('\n✅ Disparo executado com sucesso!');
    console.log('Resultado:', result);
    console.log('\n📧 Email enviado para: financeiro@calandrini.com.br');
    console.log('📋 Histórico registrado');
  } catch (error) {
    console.error('\n❌ Erro durante disparo:');
    console.error(error instanceof Error ? error.message : String(error));
  }
}

testDispatch();
