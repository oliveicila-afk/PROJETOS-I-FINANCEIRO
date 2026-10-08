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
   * Create archiving task (post)
   * API endpoint: POST /posts
   * Required fields: from, guests (array), tasks_id, lawsuits_id, start_date
   *
   * Required environment variables:
   * - ADVBOX_USER_ID_PRISCILA: User ID for task creator
   * - ADVBOX_USER_ID_GABI: User ID for archiving responsible
   * - ADVBOX_USER_ID_ANDERSON: User ID for legal responsible
   * - ADVBOX_TASK_TYPE_ID_ARQUIVAMENTO: Task type ID for "ARQUIVAMENTO DEFINITIVO DE CLIENTE"
   */
  async createArchivingTask(lawsuitId: string, archivingData: {
    honorariosContratuaisIniciais?: number;
    honorariosSucumbenciais?: number;
    honorariosContratuaisExito?: number;
    valorTotalHonorarios?: number;
    notaFiscalEmitida?: boolean;
    protocolo?: string;
    observacoes?: string;
    caseType?: CaseType;
  }): Promise<boolean> {
    try {
      const { userIds, taskTypeId } = config.advbox;

      // Validate that user IDs are configured
      if (userIds.priscila === 'PENDING' || userIds.gabi === 'PENDING') {
        throw new Error(
          'User IDs not configured. Please set:' +
          '\n- ADVBOX_USER_ID_PRISCILA' +
          '\n- ADVBOX_USER_ID_GABI' +
          '\n- ADVBOX_USER_ID_ANDERSON' +
          '\n- ADVBOX_TASK_TYPE_ID_ARQUIVAMENTO'
        );
      }

      // Build protocol comment with fee information
      const protocolLines = [
        'PROTOCOLO DE ARQUIVAMENTO – OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS',
        '',
        archivingData.protocolo || '',
        '',
        `**Honorários contratuais iniciais:** R$ ${(archivingData.honorariosContratuaisIniciais || 0).toFixed(2)}`,
        `**Honorários sucumbenciais:** R$ ${(archivingData.honorariosSucumbenciais || 0).toFixed(2)}`,
        `**Honorários contratuais de êxito:** R$ ${(archivingData.honorariosContratuaisExito || 0).toFixed(2)}`,
        `**Valor total de honorários:** R$ ${(archivingData.valorTotalHonorarios || 0).toFixed(2)}`,
        `**Nota fiscal emitida:** ${archivingData.notaFiscalEmitida ? '(x) Sim' : '( ) Não'}`,
        '',
        'Não restam obrigações a serem cumpridas, estando todas integralmente satisfeitas.',
        'Realizada a baixa e o arquivamento no ADVBOX.',
        '',
        archivingData.observacoes || '',
      ].join('\n');

      // Build guests array - always include Gabi and Anderson
      const guests = [userIds.gabi, userIds.anderson].filter(id => id !== 'PENDING');

      // Create post payload for POST /posts endpoint
      const postPayload = {
        from: userIds.priscila,          // Priscila creates the task
        guests,                            // Array with Gabi and Anderson
        tasks_id: taskTypeId,             // Task type ID
        lawsuits_id: lawsuitId,           // Lawsuit/case ID
        start_date: new Date().toISOString().split('T')[0], // Today
        comments: protocolLines,          // Full protocol in comments
        urgent: false,
        important: true,
        display_schedule: false,
      };

      console.log('Creating archiving task with payload:', {
        from: postPayload.from,
        guests: postPayload.guests,
        tasks_id: postPayload.tasks_id,
        lawsuits_id: postPayload.lawsuits_id,
        start_date: postPayload.start_date,
      });

      const response = await fetch(
        `${this.apiUrl}/posts`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(postPayload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao criar tarefa: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Task created successfully:', result);
      return true;
    } catch (error) {
      console.error(`Error creating archiving task for lawsuit ${lawsuitId}:`, error);
      throw error;
    }
  }

  /**
   * Legacy createTask - kept for compatibility
   */
  async createTask(lawsuitId: string, payload: any): Promise<boolean> {
    try {
      // Transform payload for /posts endpoint
      const postPayload = {
        from: config.advbox.userIds.priscila,
        guests: [config.advbox.userIds.gabi, config.advbox.userIds.anderson],
        tasks_id: config.advbox.taskTypeId,
        lawsuits_id: lawsuitId,
        start_date: payload.due_date || new Date().toISOString().split('T')[0],
        comments: payload.description || payload.title,
        urgent: payload.priority === 'HIGH',
        important: true,
      };

      const response = await fetch(
        `${this.apiUrl}/posts`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(postPayload),
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao criar tarefa: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error(`Error creating task for lawsuit ${lawsuitId}:`, error);
      throw error;
    }
  }
}
