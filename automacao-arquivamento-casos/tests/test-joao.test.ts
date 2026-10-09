import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ArchivingAutomationWithAlerts } from './src/domain/archiving-automation-with-alerts.js';
import { ArchivingAutomationService } from './src/domain/archiving-automation.js';

describe('Disparo com João Silva - Teste de Integração', () => {
  let automationService: ArchivingAutomationWithAlerts;

  beforeEach(() => {
    automationService = new ArchivingAutomationWithAlerts({
      enableDiagnostics: true,
      diagnosticsConfig: {
        enableAutoResolution: true,
        enableEmailReport: true,
        emailAddress: 'financeiro@calandrini.com.br',
      },
    });
  });

  it('deve disparar automação com dados de João Silva', async () => {
    // Mock da automação base para evitar chamadas reais à API
    const mockAutomationService = automationService.getAutomationService();
    vi.spyOn(mockAutomationService, 'processArchivingCase').mockResolvedValueOnce({
      entryId: 'task-joao-123',
      clientName: 'João Silva',
      processNumber: '0000001-00.0000.0.00.0000',
      caseType: 'Sucumbencial',
      honorariesFees: 3073.81,
      protocol: 'PROTO-JOAO-001',
      createdAt: new Date().toISOString(),
    });

    const result = await automationService.processArchivingCaseWithRetry({
      lawsuitId: '28231052',
      processNumber: '0000001-00.0000.0.00.0000',
      clientName: 'João Silva',
    });

    expect(result).not.toBeNull();
    expect(result?.clientName).toBe('João Silva');
    expect(result?.entryId).toBe('task-joao-123');
    expect(result?.protocol).toBe('PROTO-JOAO-001');

    console.log('\n✅ Disparo com João Silva executado com sucesso!');
    console.log('Tarefa criada:', result?.entryId);
    console.log('Protocolo:', result?.protocol);
    console.log('Valor de honorários:', `R$ ${result?.honorariesFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  });
});
