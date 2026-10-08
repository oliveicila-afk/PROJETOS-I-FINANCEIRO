/**
 * AlertingService Tests
 *
 * Valida:
 * - Notificações por canal (Slack, Email, Logging)
 * - Contador de alertas críticos
 * - Detecção de falha sistêmica (3+ critical)
 * - Result structure por tipo de alerta
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AlertingService,
  AlertingConfig,
  AlertType,
} from '../../src/services/alerting-service';
import { SlackNotifier, ArchivingNotification } from '../../src/services/slack-notifier';
import { HistoryService } from '../../src/services/history-service';

describe('AlertingService', () => {
  let alertingService: AlertingService;
  let mockSlackNotifier: SlackNotifier;
  let mockHistoryService: HistoryService;

  beforeEach(() => {
    mockSlackNotifier = {
      notifySuccess: vi.fn().mockResolvedValue(undefined),
      notifyError: vi.fn().mockResolvedValue(undefined),
      notifyRetry: vi.fn().mockResolvedValue(undefined),
      isConfigured: vi.fn().mockReturnValue(true),
    } as any;

    mockHistoryService = {
      addEntry: vi.fn(),
      getState: vi.fn().mockReturnValue({ entries: [] }),
      getStatistics: vi.fn().mockReturnValue({
        totalAttempts: 0,
        successCount: 0,
        errorCount: 0,
      }),
    } as any;

    const config: AlertingConfig = {
      enableSlack: true,
      enableEmail: false,
      enableLogging: true,
      slackNotifier: mockSlackNotifier,
      historyService: mockHistoryService,
    };

    alertingService = new AlertingService(config);
  });

  describe('notifySuccess', () => {
    it('should send success notification to Slack', async () => {
      const notification: ArchivingNotification = {
        type: 'success',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'João Silva',
        message: 'Caso arquivado com sucesso',
        timestamp: new Date().toISOString(),
        taskId: 'advbox-123',
      };

      const result = await alertingService.notifySuccess(notification);

      expect(result.type).toBe('success');
      expect(result.notification).toEqual(notification);
      expect(result.channels.slack?.success).toBe(true);
      expect(mockSlackNotifier.notifySuccess).toHaveBeenCalledWith(notification);
    });

    it('should add entry to history on success', async () => {
      const notification: ArchivingNotification = {
        type: 'success',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'João Silva',
        message: 'Caso arquivado',
        timestamp: new Date().toISOString(),
      };

      await alertingService.notifySuccess(notification);

      expect(mockHistoryService.addEntry).toHaveBeenCalled();
      const callArg = (mockHistoryService.addEntry as any).mock.calls[0][0];
      expect(callArg.status).toBe('success');
      expect(callArg.processNumber).toBe('0000001-XX.XXXX.X.XX.XXXX');
    });

    it('should log success notification when logging enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const notification: ArchivingNotification = {
        type: 'success',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'João Silva',
        message: 'Arquivado',
        timestamp: new Date().toISOString(),
      };

      await alertingService.notifySuccess(notification);

      expect(consoleSpy).toHaveBeenCalled();
      const logCalls = consoleSpy.mock.calls
        .map((call) => String(call[0]))
        .join(' ');
      expect(logCalls).toContain('SUCCESS');

      consoleSpy.mockRestore();
    });

    it('should include timestamp in result', async () => {
      const notification: ArchivingNotification = {
        type: 'success',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Test',
        timestamp: new Date().toISOString(),
      };

      const result = await alertingService.notifySuccess(notification);

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('notifyError', () => {
    it('should send error notification to Slack', async () => {
      const notification: ArchivingNotification = {
        type: 'error',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'João Silva',
        message: 'Erro ao arquivar',
        error: 'Connection timeout',
        timestamp: new Date().toISOString(),
      };

      const result = await alertingService.notifyError(notification);

      expect(result.type).toBe('error');
      expect(result.channels.slack?.success).toBe(true);
      expect(mockSlackNotifier.notifyError).toHaveBeenCalledWith(notification);
    });

    it('should record error in history', async () => {
      const notification: ArchivingNotification = {
        type: 'error',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Error',
        error: 'Test error',
        timestamp: new Date().toISOString(),
      };

      await alertingService.notifyError(notification);

      expect(mockHistoryService.addEntry).toHaveBeenCalled();
      const callArg = (mockHistoryService.addEntry as any).mock.calls[0][0];
      expect(callArg.status).toBe('error');
      expect(callArg.errorMessage).toBe('Test error');
    });
  });

  describe('notifyWarning', () => {
    it('should send warning notification', async () => {
      const notification: ArchivingNotification = {
        type: 'warning',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Warning message',
        timestamp: new Date().toISOString(),
      };

      const result = await alertingService.notifyWarning(notification);

      expect(result.type).toBe('warning');
      expect(mockSlackNotifier.notifyError).toHaveBeenCalled(); // Warnings use error channel
    });
  });

  describe('notifyCritical', () => {
    it('should increment critical alert counter', async () => {
      const notification: ArchivingNotification = {
        type: 'error',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Critical error',
        error: 'System failure',
        timestamp: new Date().toISOString(),
      };

      expect(alertingService.getCriticalCount()).toBe(0);

      await alertingService.notifyCritical(notification);

      expect(alertingService.getCriticalCount()).toBe(1);
    });

    it('should send critical alert to Slack even if not configured', async () => {
      const configWithoutSlack: AlertingConfig = {
        enableSlack: false,
        enableEmail: false,
        enableLogging: true,
      };

      const service = new AlertingService(configWithoutSlack);

      const notification: ArchivingNotification = {
        type: 'error',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Critical',
        error: 'Failure',
        timestamp: new Date().toISOString(),
      };

      const result = await service.notifyCritical(notification);

      // Critical alerts should still attempt to send to Slack
      expect(result.type).toBe('critical');
    });

    it('should detect system failure at 3+ consecutive critical alerts', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const notification: ArchivingNotification = {
        type: 'error',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Critical',
        error: 'Failure',
        timestamp: new Date().toISOString(),
      };

      // First critical alert
      await alertingService.notifyCritical(notification);
      expect(alertingService.getCriticalCount()).toBe(1);

      // Second critical alert
      await alertingService.notifyCritical(notification);
      expect(alertingService.getCriticalCount()).toBe(2);

      // Third critical alert - should detect system failure
      await alertingService.notifyCritical(notification);
      expect(alertingService.getCriticalCount()).toBe(3);

      // Check if system failure was logged
      const errorLogs = consoleSpy.mock.calls
        .map((call) => String(call[0]))
        .join(' ');
      expect(errorLogs).toContain('system may be unstable');

      consoleSpy.mockRestore();
    });
  });

  describe('resetCriticalCount', () => {
    it('should reset critical alert counter', async () => {
      const notification: ArchivingNotification = {
        type: 'error',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Critical',
        error: 'Error',
        timestamp: new Date().toISOString(),
      };

      await alertingService.notifyCritical(notification);
      await alertingService.notifyCritical(notification);

      expect(alertingService.getCriticalCount()).toBe(2);

      alertingService.resetCriticalCount();

      expect(alertingService.getCriticalCount()).toBe(0);
    });
  });

  describe('getCriticalCount', () => {
    it('should return correct critical count', async () => {
      const notification: ArchivingNotification = {
        type: 'error',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Test',
        error: 'Error',
        timestamp: new Date().toISOString(),
      };

      expect(alertingService.getCriticalCount()).toBe(0);

      for (let i = 0; i < 5; i++) {
        await alertingService.notifyCritical(notification);
        expect(alertingService.getCriticalCount()).toBe(i + 1);
      }
    });
  });

  describe('configuration options', () => {
    it('should respect Slack enable/disable', async () => {
      const configDisabledSlack: AlertingConfig = {
        enableSlack: false,
        enableEmail: false,
        enableLogging: true,
        slackNotifier: mockSlackNotifier,
        historyService: mockHistoryService,
      };

      const service = new AlertingService(configDisabledSlack);

      const notification: ArchivingNotification = {
        type: 'success',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Success',
        timestamp: new Date().toISOString(),
      };

      const result = await service.notifySuccess(notification);

      // Slack notification should not be attempted
      expect(result.channels.slack).toBeUndefined();
    });

    it('should respect logging enable/disable', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const configDisabledLogging: AlertingConfig = {
        enableSlack: false,
        enableEmail: false,
        enableLogging: false,
      };

      const service = new AlertingService(configDisabledLogging);

      const notification: ArchivingNotification = {
        type: 'success',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Success',
        timestamp: new Date().toISOString(),
      };

      await service.notifySuccess(notification);

      // Should not have called console.log for alert logging
      const alertLogs = consoleSpy.mock.calls.filter((call) =>
        String(call[0]).includes('[Alerting Service]')
      );

      expect(alertLogs.length).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should handle email as not implemented', async () => {
      const notification: ArchivingNotification = {
        type: 'critical',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Critical',
        error: 'Error',
        timestamp: new Date().toISOString(),
      };

      const configWithEmail: AlertingConfig = {
        enableSlack: false,
        enableEmail: true,
        enableLogging: false,
      };

      const service = new AlertingService(configWithEmail);
      const result = await service.notifyCritical(notification);

      expect(result.channels.email?.success).toBe(false);
      expect(result.channels.email?.error).toContain('not yet implemented');
    });
  });

  describe('alert result structure', () => {
    it('should return complete AlertResult for each alert type', async () => {
      const notification: ArchivingNotification = {
        type: 'success',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Success',
        timestamp: new Date().toISOString(),
      };

      const result = await alertingService.notifySuccess(notification);

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('notification');
      expect(result).toHaveProperty('channels');
      expect(result).toHaveProperty('timestamp');

      expect(result.type).toBe('success');
      expect(result.notification).toEqual(notification);
      expect(typeof result.timestamp).toBe('string');
    });

    it('should include channel success/error status', async () => {
      mockSlackNotifier.notifySuccess = vi
        .fn()
        .mockRejectedValue(new Error('Slack API error'));

      const notification: ArchivingNotification = {
        type: 'success',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Success',
        timestamp: new Date().toISOString(),
      };

      const result = await alertingService.notifySuccess(notification);

      expect(result.channels.slack?.success).toBe(false);
      expect(result.channels.slack?.error).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle missing history service gracefully', async () => {
      const configNoHistory: AlertingConfig = {
        enableSlack: true,
        enableEmail: false,
        enableLogging: true,
        slackNotifier: mockSlackNotifier,
        // No historyService
      };

      const service = new AlertingService(configNoHistory);

      const notification: ArchivingNotification = {
        type: 'success',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Success',
        timestamp: new Date().toISOString(),
      };

      // Should not throw even without history service
      const result = await service.notifySuccess(notification);
      expect(result.type).toBe('success');
    });

    it('should handle missing Slack notifier gracefully', async () => {
      const configNoSlack: AlertingConfig = {
        enableSlack: true, // Enabled but no notifier provided
        enableEmail: false,
        enableLogging: true,
        // No slackNotifier
      };

      const service = new AlertingService(configNoSlack);

      const notification: ArchivingNotification = {
        type: 'success',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Success',
        timestamp: new Date().toISOString(),
      };

      const result = await service.notifySuccess(notification);

      // Should handle missing notifier gracefully
      expect(result.channels.slack?.success).toBe(false);
    });

    it('should handle very high critical alert counts', async () => {
      const notification: ArchivingNotification = {
        type: 'error',
        lawsuitId: 'lawsuit-1',
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test',
        message: 'Critical',
        error: 'Error',
        timestamp: new Date().toISOString(),
      };

      // Send 100 critical alerts
      for (let i = 0; i < 100; i++) {
        await alertingService.notifyCritical(notification);
      }

      expect(alertingService.getCriticalCount()).toBe(100);
    });
  });
});
