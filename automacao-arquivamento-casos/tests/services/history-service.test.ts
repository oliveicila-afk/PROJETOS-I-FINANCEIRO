/**
 * HistoryService Tests
 *
 * Valida:
 * - Persistence em arquivo JSON
 * - Search by process number
 * - Search by client name
 * - Retention de últimas 100 entradas
 * - Estatísticas agregadas
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HistoryService, ArchivingHistoryEntry } from '../../src/services/history-service';
import fs from 'fs';
import path from 'path';

// Mock file system
vi.mock('fs');

describe('HistoryService', () => {
  let historyService: HistoryService;
  const testHistoryFile = path.join(process.cwd(), '.test-archiving-history.json');

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock fs.readFileSync to return empty state
    (fs.readFileSync as any).mockImplementation((file: string) => {
      if (file.includes('history')) {
        return JSON.stringify({
          lastUpdated: new Date().toISOString(),
          totalAttempts: 0,
          successCount: 0,
          errorCount: 0,
          entries: [],
        });
      }
      return '{}';
    });

    // Mock fs.writeFileSync
    (fs.writeFileSync as any).mockImplementation(() => {});

    historyService = new HistoryService(testHistoryFile);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addEntry', () => {
    it('should add a new entry with auto-generated ID', () => {
      const entry: Omit<ArchivingHistoryEntry, 'id'> = {
        timestamp: new Date().toISOString(),
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'João Silva',
        lawsuitId: 'lawsuit-123',
        status: 'success',
        attempt: 1,
        maxAttempts: 3,
        result: {
          taskId: 'advbox-123',
          protocol: '2026ADVM000001',
          honoraries: 'R$ 1.200,00',
          caseType: 'CONTRATUAL',
        },
        durationMs: 1500,
      };

      historyService.addEntry(entry);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const state = historyService.getState();
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0].id).toBeDefined();
      expect(state.entries[0].clientName).toBe('João Silva');
      expect(state.totalAttempts).toBe(1);
      expect(state.successCount).toBe(1);
    });

    it('should track success and error counts', () => {
      const successEntry: Omit<ArchivingHistoryEntry, 'id'> = {
        timestamp: new Date().toISOString(),
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Client 1',
        lawsuitId: 'lawsuit-1',
        status: 'success',
        attempt: 1,
        maxAttempts: 1,
        durationMs: 1000,
      };

      const errorEntry: Omit<ArchivingHistoryEntry, 'id'> = {
        timestamp: new Date().toISOString(),
        processNumber: '0000002-XX.XXXX.X.XX.XXXX',
        clientName: 'Client 2',
        lawsuitId: 'lawsuit-2',
        status: 'error',
        attempt: 3,
        maxAttempts: 3,
        errorMessage: 'Connection timeout',
        durationMs: 5000,
      };

      historyService.addEntry(successEntry);
      historyService.addEntry(errorEntry);

      const state = historyService.getState();
      expect(state.totalAttempts).toBe(2);
      expect(state.successCount).toBe(1);
      expect(state.errorCount).toBe(1);
    });
  });

  describe('findByProcessNumber', () => {
    beforeEach(() => {
      const entries = [
        {
          timestamp: new Date().toISOString(),
          processNumber: '0000001-XX.XXXX.X.XX.XXXX',
          clientName: 'João Silva',
          lawsuitId: 'lawsuit-1',
          status: 'success',
          attempt: 1,
          maxAttempts: 1,
          durationMs: 1000,
        },
        {
          timestamp: new Date().toISOString(),
          processNumber: '0000002-XX.XXXX.X.XX.XXXX',
          clientName: 'Maria Santos',
          lawsuitId: 'lawsuit-2',
          status: 'success',
          attempt: 1,
          maxAttempts: 1,
          durationMs: 1200,
        },
      ];

      entries.forEach((entry) => historyService.addEntry(entry));
    });

    it('should find entry by exact process number', () => {
      const found = historyService.findByProcessNumber('0000001-XX.XXXX.X.XX.XXXX');

      expect(found).toBeDefined();
      expect(found).toHaveLength(1);
      expect(found[0].clientName).toBe('João Silva');
    });

    it('should return empty array when process number not found', () => {
      const found = historyService.findByProcessNumber('9999999-XX.XXXX.X.XX.XXXX');

      expect(found).toEqual([]);
    });
  });

  describe('findByClientName', () => {
    beforeEach(() => {
      const entries = [
        {
          timestamp: new Date().toISOString(),
          processNumber: '0000001-XX.XXXX.X.XX.XXXX',
          clientName: 'João Silva',
          lawsuitId: 'lawsuit-1',
          status: 'success',
          attempt: 1,
          maxAttempts: 1,
          durationMs: 1000,
        },
        {
          timestamp: new Date().toISOString(),
          processNumber: '0000002-XX.XXXX.X.XX.XXXX',
          clientName: 'João Silva',
          lawsuitId: 'lawsuit-2',
          status: 'error',
          attempt: 2,
          maxAttempts: 3,
          errorMessage: 'Failed',
          durationMs: 2000,
        },
        {
          timestamp: new Date().toISOString(),
          processNumber: '0000003-XX.XXXX.X.XX.XXXX',
          clientName: 'Maria Santos',
          lawsuitId: 'lawsuit-3',
          status: 'success',
          attempt: 1,
          maxAttempts: 1,
          durationMs: 1500,
        },
      ];

      entries.forEach((entry) => historyService.addEntry(entry));
    });

    it('should find all entries by client name', () => {
      const found = historyService.findByClientName('João Silva');

      expect(found).toHaveLength(2);
      // Entries are stored newest-first (unshift), so newer entries appear first
      expect(found[0].processNumber).toBe('0000002-XX.XXXX.X.XX.XXXX');
      expect(found[1].processNumber).toBe('0000001-XX.XXXX.X.XX.XXXX');
    });

    it('should return empty array when client not found', () => {
      const found = historyService.findByClientName('Nonexistent Client');

      expect(found).toEqual([]);
    });

    it('should support case-insensitive search', () => {
      const found = historyService.findByClientName('joão silva');

      expect(found.length).toBeGreaterThan(0);
    });
  });

  describe('getLastEntries', () => {
    beforeEach(() => {
      for (let i = 1; i <= 10; i++) {
        historyService.addEntry({
          timestamp: new Date(Date.now() - i * 1000).toISOString(),
          processNumber: `000000${i}-XX.XXXX.X.XX.XXXX`,
          clientName: `Client ${i}`,
          lawsuitId: `lawsuit-${i}`,
          status: i % 2 === 0 ? 'success' : 'error',
          attempt: 1,
          maxAttempts: 1,
          durationMs: 1000 + i * 100,
        });
      }
    });

    it('should return last N entries in reverse chronological order', () => {
      const lastFive = historyService.getLastEntries(5);

      expect(lastFive).toHaveLength(5);
      // Entries are stored newest-first (unshift), so slice(0, N) returns oldest N
      // The test adds entries 1-10 where Client 1 is newest (now-1s) and Client 10 is oldest (now-10s)
      // With 10 entries total, getLastEntries(5) returns entries [10, 9, 8, 7, 6]
      expect(lastFive[0].clientName).toBe('Client 10');
      expect(lastFive[4].clientName).toBe('Client 6');
    });

    it('should return all entries if count > total', () => {
      const all = historyService.getLastEntries(100);

      expect(all.length).toBeLessThanOrEqual(10);
    });

    it('should handle zero count gracefully', () => {
      const empty = historyService.getLastEntries(0);

      expect(empty).toEqual([]);
    });
  });

  describe('getEntriesInLastMinutes', () => {
    beforeEach(() => {
      const now = Date.now();

      // Add entries at different times
      const entries = [
        {
          timestamp: new Date(now - 30 * 1000).toISOString(), // 30 seconds ago
          processNumber: '0000001-XX.XXXX.X.XX.XXXX',
          clientName: 'Recent 1',
          lawsuitId: 'lawsuit-1',
          status: 'success' as const,
          attempt: 1,
          maxAttempts: 1,
          durationMs: 1000,
        },
        {
          timestamp: new Date(now - 90 * 1000).toISOString(), // 90 seconds ago
          processNumber: '0000002-XX.XXXX.X.XX.XXXX',
          clientName: 'Recent 2',
          lawsuitId: 'lawsuit-2',
          status: 'success' as const,
          attempt: 1,
          maxAttempts: 1,
          durationMs: 1000,
        },
        {
          timestamp: new Date(now - 5 * 60 * 1000).toISOString(), // 5 minutes ago
          processNumber: '0000003-XX.XXXX.X.XX.XXXX',
          clientName: 'Old',
          lawsuitId: 'lawsuit-3',
          status: 'success' as const,
          attempt: 1,
          maxAttempts: 1,
          durationMs: 1000,
        },
      ];

      entries.forEach((entry) => historyService.addEntry(entry));
    });

    it('should return entries within specified minute range', () => {
      const entries = historyService.getEntriesInLastMinutes(2);

      // Should include entries from last 2 minutes
      expect(entries.length).toBeGreaterThan(0);
      entries.forEach((entry) => {
        const age = Date.now() - new Date(entry.timestamp).getTime();
        expect(age).toBeLessThan(2 * 60 * 1000);
      });
    });

    it('should exclude entries outside the minute range', () => {
      const entries = historyService.getEntriesInLastMinutes(1);

      // The 5-minute old entry should not be included
      const oldEntry = entries.find((e) => e.clientName === 'Old');
      expect(oldEntry).toBeUndefined();
    });
  });

  describe('getStatistics', () => {
    it('should calculate accurate statistics', () => {
      for (let i = 1; i <= 10; i++) {
        historyService.addEntry({
          timestamp: new Date().toISOString(),
          processNumber: `000000${i}-XX.XXXX.X.XX.XXXX`,
          clientName: `Client ${i}`,
          lawsuitId: `lawsuit-${i}`,
          status: i <= 7 ? 'success' : 'error',
          attempt: 1,
          maxAttempts: 1,
          durationMs: 1000,
        });
      }

      const stats = historyService.getStatistics();

      expect(stats.totalAttempts).toBe(10);
      expect(stats.successCount).toBe(7);
      expect(stats.errorCount).toBe(3);
      expect(stats.successRate).toBe(70);
    });

    it('should return 0% success rate when all failed', () => {
      for (let i = 1; i <= 5; i++) {
        historyService.addEntry({
          timestamp: new Date().toISOString(),
          processNumber: `000000${i}-XX.XXXX.X.XX.XXXX`,
          clientName: `Client ${i}`,
          lawsuitId: `lawsuit-${i}`,
          status: 'error',
          attempt: 3,
          maxAttempts: 3,
          errorMessage: 'Failed',
          durationMs: 3000,
        });
      }

      const stats = historyService.getStatistics();

      expect(stats.successRate).toBe(0);
      expect(stats.errorCount).toBe(5);
    });

    it('should return 100% success rate when all succeeded', () => {
      for (let i = 1; i <= 5; i++) {
        historyService.addEntry({
          timestamp: new Date().toISOString(),
          processNumber: `000000${i}-XX.XXXX.X.XX.XXXX`,
          clientName: `Client ${i}`,
          lawsuitId: `lawsuit-${i}`,
          status: 'success',
          attempt: 1,
          maxAttempts: 1,
          durationMs: 1000,
        });
      }

      const stats = historyService.getStatistics();

      expect(stats.successRate).toBe(100);
      expect(stats.successCount).toBe(5);
      expect(typeof stats.successRate).toBe('number');
    });
  });

  describe('retention policy', () => {
    it('should keep only last 100 entries', () => {
      // Add 150 entries
      for (let i = 1; i <= 150; i++) {
        historyService.addEntry({
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          processNumber: `${String(i).padStart(7, '0')}-XX.XXXX.X.XX.XXXX`,
          clientName: `Client ${i}`,
          lawsuitId: `lawsuit-${i}`,
          status: 'success',
          attempt: 1,
          maxAttempts: 1,
          durationMs: 1000,
        });
      }

      const state = historyService.getState();

      // Should only keep 100
      expect(state.entries.length).toBe(100);
      // Should be the most recent 100 (entries 51-150)
      expect(state.entries[0].clientName).toBe('Client 150');
      expect(state.entries[99].clientName).toBe('Client 51');
    });
  });

  describe('getState', () => {
    it('should return current state with all fields', () => {
      historyService.addEntry({
        timestamp: new Date().toISOString(),
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Test Client',
        lawsuitId: 'lawsuit-1',
        status: 'success',
        attempt: 1,
        maxAttempts: 1,
        durationMs: 1000,
      });

      const state = historyService.getState();

      expect(state).toHaveProperty('lastUpdated');
      expect(state).toHaveProperty('totalAttempts');
      expect(state).toHaveProperty('successCount');
      expect(state).toHaveProperty('errorCount');
      expect(state).toHaveProperty('entries');
      expect(state.totalAttempts).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle entries with no result object', () => {
      const entry: Omit<ArchivingHistoryEntry, 'id'> = {
        timestamp: new Date().toISOString(),
        processNumber: '0000001-XX.XXXX.X.XX.XXXX',
        clientName: 'Failed Client',
        lawsuitId: 'lawsuit-1',
        status: 'error',
        attempt: 3,
        maxAttempts: 3,
        errorMessage: 'Timeout',
        durationMs: 5000,
      };

      historyService.addEntry(entry);

      const state = historyService.getState();
      expect(state.entries[0].result).toBeUndefined();
      expect(state.entries[0].errorMessage).toBe('Timeout');
    });

    it('should handle special characters in client names', () => {
      const specialNames = [
        "Cliente & Filho's",
        'João José Dias-Silva',
        'EMPRESA (LTDA)',
        '株式会社テスト',
      ];

      specialNames.forEach((name) => {
        historyService.addEntry({
          timestamp: new Date().toISOString(),
          processNumber: `0000${specialNames.indexOf(name) + 1}-XX.XXXX.X.XX.XXXX`,
          clientName: name,
          lawsuitId: `lawsuit-${name}`,
          status: 'success',
          attempt: 1,
          maxAttempts: 1,
          durationMs: 1000,
        });
      });

      specialNames.forEach((name) => {
        const found = historyService.findByClientName(name);
        expect(found.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty history gracefully', () => {
      const stats = historyService.getStatistics();

      expect(stats.totalAttempts).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(typeof stats.successRate).toBe('number');
    });
  });
});
