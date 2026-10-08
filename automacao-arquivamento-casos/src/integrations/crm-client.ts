/**
 * Advbox CRM Client
 *
 * Handles communication with Advbox CRM API for monitoring Financial workflow
 * and detecting when cases reach "Para Arquivamento" (For Archiving) status
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config.js';

export interface CRMCase {
  id: string;
  lawsuit_id?: number;
  process_number?: string;
  client_name?: string;
  current_column?: string;
  value?: number;
  created_at?: string;
  updated_at?: string;
  status?: string;
}

export interface CRMColumn {
  id: string;
  name: string;
  position: number;
  case_count: number;
}

export class CRMClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.advbox.apiUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${config.advbox.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Get all columns in the Financial CRM workflow
   * Expected columns: Conferência Financeira Final, Em Espera | Pagamento, Ordem de Depósito,
   *                   Depósito Realizado, Pagamento Realizado, Para Arquivamento
   */
  async getFinancialColumns(): Promise<CRMColumn[]> {
    try {
      const response = await this.client.get('/crm/boards/financeiro/columns', {
        params: {
          limit: 50,
        },
      });

      return response.data.columns || [];
    } catch (error) {
      console.error('Error fetching CRM financial columns:', error);
      throw error;
    }
  }

  /**
   * Get cases in a specific CRM column
   * @param columnId - ID of the column (e.g., "Para Arquivamento")
   * @param limit - Max results to return
   * @param offset - Pagination offset
   */
  async getCasesInColumn(
    columnId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CRMCase[]> {
    try {
      const response = await this.client.get(`/crm/boards/financeiro/columns/${columnId}/cases`, {
        params: {
          limit,
          offset,
        },
      });

      return response.data.cases || [];
    } catch (error) {
      console.error(`Error fetching cases in column ${columnId}:`, error);
      throw error;
    }
  }

  /**
   * Get all cases in Financial CRM that are ready for archiving
   * (currently in "Para Arquivamento" or "Pagamento Realizado" columns)
   */
  async getCasesReadyForArchiving(): Promise<CRMCase[]> {
    try {
      const columns = await this.getFinancialColumns();
      const archivingStatusColumns = columns.filter(col =>
        col.name.toLowerCase().includes('arquivamento') ||
        col.name.toLowerCase().includes('pagamento realizado')
      );

      const allCases: CRMCase[] = [];

      for (const column of archivingStatusColumns) {
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const cases = await this.getCasesInColumn(column.id, 50, offset);
          allCases.push(...cases);

          hasMore = cases.length === 50;
          offset += 50;
        }
      }

      return allCases;
    } catch (error) {
      console.error('Error getting cases ready for archiving:', error);
      throw error;
    }
  }

  /**
   * Get a specific case's current CRM status and column
   * @param caseId - Case ID in Advbox
   */
  async getCaseStatus(caseId: string): Promise<CRMCase | null> {
    try {
      const response = await this.client.get(`/crm/cases/${caseId}`);
      return response.data.case || null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error(`Error fetching case status for ${caseId}:`, error);
      throw error;
    }
  }

  /**
   * Get cases by process number (for cross-referencing with lawsuit API)
   * @param processNumber - Process number (e.g., "0052754-30.2026.8.04.1000")
   */
  async getCaseByProcessNumber(processNumber: string): Promise<CRMCase | null> {
    try {
      const response = await this.client.get('/crm/cases/search', {
        params: {
          process_number: processNumber,
          limit: 1,
        },
      });

      const cases = response.data.cases || [];
      return cases[0] || null;
    } catch (error) {
      console.error(`Error searching for case with process ${processNumber}:`, error);
      throw error;
    }
  }

  /**
   * Monitor CRM changes via webhook or polling
   * This would typically be called periodically or triggered by webhooks
   */
  async detectNewArchivedCases(lastCheckTimestamp?: string): Promise<CRMCase[]> {
    try {
      const response = await this.client.get('/crm/boards/financeiro/changes', {
        params: {
          since: lastCheckTimestamp,
          limit: 100,
        },
      });

      return response.data.cases || [];
    } catch (error) {
      console.error('Error detecting CRM changes:', error);
      throw error;
    }
  }
}

export default CRMClient;
