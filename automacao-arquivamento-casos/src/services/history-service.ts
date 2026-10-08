import fs from 'fs';
import path from 'path';

/**
 * Histórico de uma tentativa de arquivamento
 */
export interface ArchivingHistoryEntry {
  id: string;                           // UUID único
  timestamp: string;                    // ISO 8601
  processNumber: string;                // Número do processo
  clientName: string;                   // Nome do cliente
  lawsuitId: string;                    // ID do caso
  status: 'success' | 'error' | 'retry'; // Status
  attempt: number;                      // Número da tentativa
  maxAttempts: number;                  // Total de tentativas
  errorMessage?: string;                // Mensagem de erro (se houver)
  result?: {
    taskId?: string;
    protocol?: string;
    honoraries?: string;
    caseType?: string;
  };
  durationMs: number;                   // Tempo de execução em ms
}

/**
 * Estado do histórico
 */
export interface HistoryState {
  lastUpdated: string;
  totalAttempts: number;
  successCount: number;
  errorCount: number;
  entries: ArchivingHistoryEntry[];
}

/**
 * HistoryService: Rastreia todas as tentativas de arquivamento
 *
 * Persiste em arquivo JSON (.archiving-history.json)
 * Mantém registro dos últimos 100 arquivamentos
 */
export class HistoryService {
  private filePath: string;
  private maxEntries: number = 100; // Mantém histórico dos últimos 100
  private state: HistoryState;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), '.archiving-history.json');
    this.state = this.loadState();
  }

  /**
   * Carrega estado do arquivo ou cria novo
   */
  private loadState(): HistoryState {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(data) as HistoryState;
        console.log(`[History Service] Loaded ${parsed.entries.length} entries from history`);
        return parsed;
      }
    } catch (error) {
      console.warn('[History Service] Failed to load history:', error);
    }

    // Estado inicial
    return {
      lastUpdated: new Date().toISOString(),
      totalAttempts: 0,
      successCount: 0,
      errorCount: 0,
      entries: [],
    };
  }

  /**
   * Salva estado no arquivo
   */
  private saveState(): void {
    try {
      this.state.lastUpdated = new Date().toISOString();

      // Trunca para maxEntries (keeping the newest entries)
      if (this.state.entries.length > this.maxEntries) {
        this.state.entries = this.state.entries.slice(0, this.maxEntries);
      }

      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
      console.log('[History Service] State saved to file');
    } catch (error) {
      console.error('[History Service] Failed to save state:', error);
    }
  }

  /**
   * Adiciona entrada ao histórico
   */
  addEntry(entry: Omit<ArchivingHistoryEntry, 'id'>): ArchivingHistoryEntry {
    const fullEntry: ArchivingHistoryEntry = {
      ...entry,
      id: this.generateId(),
    };

    this.state.entries.unshift(fullEntry); // Add to beginning (most recent first)
    this.state.totalAttempts++;

    if (entry.status === 'success') {
      this.state.successCount++;
    } else if (entry.status === 'error') {
      this.state.errorCount++;
    }

    this.saveState();

    console.log(
      `[History Service] Entry added: ${entry.clientName} | ${entry.processNumber} | Status: ${entry.status}`
    );

    return fullEntry;
  }

  /**
   * Busca entradas por número de processo
   */
  findByProcessNumber(processNumber: string): ArchivingHistoryEntry[] {
    return this.state.entries.filter((e) => e.processNumber === processNumber);
  }

  /**
   * Busca entradas por cliente
   */
  findByClientName(clientName: string): ArchivingHistoryEntry[] {
    return this.state.entries.filter((e) =>
      e.clientName.toLowerCase().includes(clientName.toLowerCase())
    );
  }

  /**
   * Busca últimas N entradas (mais recentes primeiro)
   */
  getLastEntries(count: number = 10): ArchivingHistoryEntry[] {
    return this.state.entries.slice(0, count);
  }

  /**
   * Busca entradas por data (last N minutes)
   */
  getEntriesInLastMinutes(minutes: number): ArchivingHistoryEntry[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    return this.state.entries.filter((e) => e.timestamp > cutoff);
  }

  /**
   * Retorna estatísticas
   */
  getStatistics(): {
    totalAttempts: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    lastUpdated: string;
  } {
    const total = this.state.totalAttempts;
    const success = this.state.successCount;
    const rate = total > 0 ? (success / total) * 100 : 0;

    return {
      totalAttempts: total,
      successCount: success,
      errorCount: this.state.errorCount,
      successRate: Math.round(rate * 100) / 100, // Round to 2 decimal places
      lastUpdated: this.state.lastUpdated,
    };
  }

  /**
   * Retorna estado completo
   */
  getState(): HistoryState {
    return JSON.parse(JSON.stringify(this.state)); // Deep copy
  }

  /**
   * Limpa histórico (útil para testes)
   */
  clear(): void {
    this.state = {
      lastUpdated: new Date().toISOString(),
      totalAttempts: 0,
      successCount: 0,
      errorCount: 0,
      entries: [],
    };
    this.saveState();
    console.log('[History Service] History cleared');
  }

  /**
   * Gera ID único (timestamp + random)
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `${timestamp}-${random}`;
  }
}

/**
 * Singleton instance
 */
let globalHistoryService: HistoryService | null = null;

/**
 * Retorna ou cria instância global
 */
export function getGlobalHistoryService(filePath?: string): HistoryService {
  if (!globalHistoryService) {
    globalHistoryService = new HistoryService(filePath);
    console.log('[History Service] Global instance created');
  }
  return globalHistoryService;
}

/**
 * Reseta instância global (útil para testes)
 */
export function resetGlobalHistoryService(): void {
  globalHistoryService = null;
  console.log('[History Service] Global instance reset');
}

export default HistoryService;
