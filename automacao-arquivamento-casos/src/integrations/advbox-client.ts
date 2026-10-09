import { getAdvBoxConfig, config } from '../config.js';
import { detectCaseType, CaseType, determineCaseTypeFromLawsuit } from '../utils/case-type-detector.js';

export interface AdvBoxCase {
  id: string;
  clientName: string;
  clientCPF: string;
  processNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivingReason?: string;
  successValue?: number;
  sucumbencialValue?: number;
  caseType?: CaseType;
}

export interface AdvBoxTask {
  id: string;
  title: string;
  description: string;
  caseId: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

export class AdvBoxClient {
  private apiUrl: string;
  private token: string;

  constructor() {
    const advboxConfig = config.advbox;
    this.apiUrl = advboxConfig.apiUrl;
    this.token = advboxConfig.token;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  async searchCases(filters: {
    status?: string;
    clientName?: string;
    limit?: number;
    offset?: number;
  }): Promise<AdvBoxCase[]> {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.clientName) params.append('client_name', filters.clientName);
    params.append('limit', String(filters.limit || 50));
    params.append('offset', String(filters.offset || 0));

    const response = await fetch(
      `${this.apiUrl}/cases?${params.toString()}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Erro ao buscar casos: ${response.statusText}`);
    }

    const data = await response.json() as { cases: AdvBoxCase[] };
    return data.cases;
  }

  async getCaseDetails(caseId: string): Promise<AdvBoxCase> {
    // Try /lawsuits endpoint first (primary endpoint in Advbox)
    // The case_id parameter is actually a lawsuit_id in Advbox
    const response = await fetch(
      `${this.apiUrl}/lawsuits/${caseId}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      // Incluir diagnóstico no erro
      const diagnosticInfo = {
        statusCode: response.status,
        statusText: response.statusText,
        endpoint: `${this.apiUrl}/lawsuits/${caseId}`,
        caseId,
      };

      throw new Error(
        `Erro ao buscar caso ${caseId}: ${response.statusText} | ` +
        `Diagnóstico: ${JSON.stringify(diagnosticInfo)}`
      );
    }

    return response.json() as Promise<AdvBoxCase>;
  }

  async createTask(caseId: string, task: {
    title: string;
    description: string;
    assignTo?: string;
  }): Promise<AdvBoxTask> {
    const payload = {
      title: task.title,
      description: task.description,
      ...(task.assignTo && { assigned_to: task.assignTo }),
    };

    const response = await fetch(
      `${this.apiUrl}/cases/${caseId}/tasks`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao criar tarefa: ${response.statusText}`);
    }

    return response.json() as Promise<AdvBoxTask>;
  }

  async searchTasks(caseId: string): Promise<AdvBoxTask[]> {
    const response = await fetch(
      `${this.apiUrl}/cases/${caseId}/tasks`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Erro ao buscar tarefas: ${response.statusText}`);
    }

    const data = await response.json() as { tasks: AdvBoxTask[] };
    return data.tasks;
  }

  async updateCaseStatus(caseId: string, status: string): Promise<AdvBoxCase> {
    const response = await fetch(
      `${this.apiUrl}/cases/${caseId}`,
      {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao atualizar caso: ${response.statusText}`);
    }

    return response.json() as Promise<AdvBoxCase>;
  }

  async getClientCases(clientId: string): Promise<AdvBoxCase[]> {
    const response = await fetch(
      `${this.apiUrl}/clients/${clientId}/cases`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Erro ao buscar casos do cliente: ${response.statusText}`);
    }

    const data = await response.json() as { cases: AdvBoxCase[] };
    return data.cases;
  }

  /**
   * Get lawsuit details by process number (CNJ format)
   * API endpoint: GET /lawsuits?process_number=NUMERO_CNJ
   * Used in archiving automation to fetch case details when entry arrives with process number
   */
  async getLawsuitByNumber(processNumber: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.apiUrl}/lawsuits?process_number=${encodeURIComponent(processNumber)}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar processo ${processNumber}: ${response.statusText}`);
      }

      const data = await response.json() as any;
      // API returns array of lawsuits, get the first match
      return data.data?.[0] || data?.lawsuits?.[0] || null;
    } catch (error) {
      console.error(`Error fetching lawsuit by number ${processNumber}:`, error);
      return null;
    }
  }

  /**
   * Get lawsuit details by ID
   * Legacy method for compatibility
   */
  async getLawsuit(lawsuitId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.apiUrl}/lawsuits/${lawsuitId}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar processo ${lawsuitId}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Error fetching lawsuit ${lawsuitId}:`, error);
      return null;
    }
  }

  /**
   * Get case tasks (for validation check #3)
   */
  async getCaseTasks(caseId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.apiUrl}/lawsuits/${caseId}/tasks`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar tarefas: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.tasks || [];
    } catch (error) {
      console.error(`Error fetching case tasks for ${caseId}:`, error);
      return [];
    }
  }

  /**
   * Create a post/task in Advbox (based on Crossel pattern)
   * Posts are like annotations/comments on a lawsuit case
   * Used for task creation and assignment in archiving workflow
   */
  async createPost(data: Record<string, unknown>): Promise<any> {
    try {
      const response = await fetch(
        `${this.apiUrl}/posts`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao criar post/tarefa: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  /**
   * Update lawsuit responsible person
   * Used to assign lawsuit to a specific user
   */
  async updateLawsuit(lawsuitId: string, data: Record<string, unknown>): Promise<any> {
    try {
      const response = await fetch(
        `${this.apiUrl}/lawsuits/${lawsuitId}`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao atualizar processo: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error updating lawsuit:', error);
      throw error;
    }
  }

}
