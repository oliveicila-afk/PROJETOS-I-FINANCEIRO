import { describe, it, expect, beforeEach } from 'vitest';
import { ArchivingWithDiagnostics } from '../src/services/archiving-with-diagnostics.js';
import { DiagnosticReport } from '../src/domain/diagnostic-report.js';

describe('Diagnostics Integration', () => {
  let service: ArchivingWithDiagnostics;

  beforeEach(() => {
    service = new ArchivingWithDiagnostics({
      enableAutoResolution: true,
      enableEmailReport: false,
    });
  });

  it('should execute successfully', async () => {
    const result = await service.executeWithDiagnostics(
      'test-exec-001',
      '28231052',
      'John Silva',
      '12345678900',
      '0000001-00.0000.0.00.0000',
      async () => ({
        result: { success: true },
        taskId: 'task-123',
        protocolContent: 'Protocol content',
      })
    );

    expect(result.success).toBe(true);
    expect(result.report).toBeInstanceOf(DiagnosticReport);
  });

  it('should generate HTML report', async () => {
    const result = await service.executeWithDiagnostics(
      'test-exec-002',
      '28231052',
      'John Silva',
      '12345678900',
      '0000001-00.0000.0.00.0000',
      async () => ({
        result: { taskId: 'task-123' },
        taskId: 'task-123',
        protocolContent: 'Protocol content',
      })
    );

    const html = result.report.generateEmailReport();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('John Silva');
    expect(html).toContain('28231052');
  });

  it('should generate text report', async () => {
    const result = await service.executeWithDiagnostics(
      'test-exec-003',
      '28231052',
      'John Silva',
      '12345678900',
      '0000001-00.0000.0.00.0000',
      async () => ({
        result: { taskId: 'task-123' },
        taskId: 'task-123',
        protocolContent: 'Protocol content',
      })
    );

    const text = result.report.generateTextReport();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('John Silva');
  });

  it('should mask CPF in reports', async () => {
    const result = await service.executeWithDiagnostics(
      'test-exec-004',
      '28231052',
      'John Silva',
      '12345678900',
      '0000001-00.0000.0.00.0000',
      async () => ({
        result: { taskId: 'task-123' },
        taskId: 'task-123',
        protocolContent: 'Protocol',
      })
    );

    const html = result.report.generateEmailReport();
    expect(html).not.toContain('12345678900');
  });

  it('should capture errors', async () => {
    const result = await service.executeWithDiagnostics(
      'test-exec-005',
      '28231052',
      'John Silva',
      '12345678900',
      '0000001-00.0000.0.00.0000',
      async () => {
        throw new Error('Test error');
      }
    );

    expect(result.success).toBe(false);
    expect(result.report.getData().status).toBe('failed');
  });

  it('should include warnings in report', async () => {
    const result = await service.executeWithDiagnostics(
      'test-exec-006',
      '28231052',
      'John Silva',
      '12345678900',
      '0000001-00.0000.0.00.0000',
      async () => ({
        result: { taskId: 'task-123' },
        taskId: 'task-123',
        protocolContent: 'Protocol',
      })
    );

    result.report.addWarning('Test warning');
    expect(result.report.getData().warnings).toHaveLength(1);
  });
});
