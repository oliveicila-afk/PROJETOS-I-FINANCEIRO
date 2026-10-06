import { AdvBoxConfig } from '../config.js';

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

  constructor(config: AdvBoxConfig) {
    this.apiUrl = config.apiUrl;
    this.token = config.token;
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
    const response = await fetch(
      `${this.apiUrl}/cases/${caseId}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Erro ao buscar caso ${caseId}: ${response.statusText}`);
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
}
