import { AdvBoxClient, AdvBoxCase, AdvBoxTask } from './advbox-client.js';
import { AsaasClient, AsaasPayment } from './asaas-client.js';
import { AdvBoxConfig, AsaasConfig } from '../config.js';

export interface AdapterError {
  code: string;
  message: string;
  details?: string;
}

/**
 * Adaptador isolado para Advbox e Asaas.
 *
 * Esta é a fronteira única entre a lógica de negócio (Service) e as APIs externas.
 * - Service chama apenas métodos deste adaptador
 * - Clients não são acessados diretamente
 * - Erros são padronizados e seguros
 * - Retry logic e timeouts centralizados
 */
export class ArchivingAdapter {
  private advboxClient: AdvBoxClient;
  private asaasClient: AsaasClient;

  constructor(advboxConfig: AdvBoxConfig, asaasConfig: AsaasConfig) {
    this.advboxClient = new AdvBoxClient(advboxConfig);
    this.asaasClient = new AsaasClient(asaasConfig);
  }

  /**
   * Busca detalhes de um caso no Advbox
   * @throws AdapterError se caso não encontrado ou API falha
   */
  async getCaseDetails(caseId: string): Promise<AdvBoxCase> {
    try {
      return await this.advboxClient.getCaseDetails(caseId);
    } catch (error) {
      throw this.formatError(
        'ADVBOX_FETCH_FAILED',
        `Não foi possível buscar caso ${caseId}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Busca todas as tarefas de um caso
   * @throws AdapterError se falha na busca
   */
  async getCaseTasks(caseId: string): Promise<AdvBoxTask[]> {
    try {
      return await this.advboxClient.searchTasks(caseId);
    } catch (error) {
      throw this.formatError(
        'ADVBOX_TASKS_FAILED',
        `Não foi possível buscar tarefas do caso ${caseId}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Busca número do processo no Asaas pela descrição (CPF/dados do cliente)
   * Retorna null se não encontrado (não é erro)
   */
  async findProcessNumberByDescription(description: string): Promise<string | null> {
    try {
      const payments = await this.asaasClient.searchPaymentsByDescription(description);

      for (const payment of payments) {
        const processNumber = this.asaasClient.extractProcessNumber(payment.description);
        if (processNumber) {
          return processNumber;
        }
      }

      return null;
    } catch (error) {
      // Log o erro mas não falha o fluxo — é um alerta, não um bloqueador
      console.warn(
        `⚠️ Aviso: Erro ao buscar processo no Asaas: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Verifica todas as ações (casos) de um cliente
   * @throws AdapterError se falha na busca
   */
  async getClientCases(clientId: string): Promise<AdvBoxCase[]> {
    try {
      return await this.advboxClient.getClientCases(clientId);
    } catch (error) {
      throw this.formatError(
        'ADVBOX_CLIENT_CASES_FAILED',
        `Não foi possível buscar ações do cliente`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Cria tarefa de protocolo no Advbox e atribui para Gabi
   * @throws AdapterError se falha na criação
   */
  async createArchivingProtocol(
    caseId: string,
    title: string,
    content: string
  ): Promise<AdvBoxTask> {
    try {
      return await this.advboxClient.createTask(caseId, {
        title,
        description: content,
        assignTo: 'gabi',
      });
    } catch (error) {
      throw this.formatError(
        'ADVBOX_CREATE_FAILED',
        `Não foi possível criar protocolo no Advbox`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Valida conectividade com APIs antes de executar fluxo completo
   * @returns true se ambas APIs acessíveis
   */
  async validateConnectivity(): Promise<boolean> {
    try {
      // Testa Advbox com um GET simples
      await this.advboxClient.searchCases({ limit: 1 });
      console.log('✅ Advbox conectado');

      // Testa Asaas
      await this.asaasClient.searchPayments({ limit: 1 });
      console.log('✅ Asaas conectado');

      return true;
    } catch (error) {
      console.error(
        `❌ Erro de conectividade: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Formata erro de forma padronizada e segura
   * Nunca expõe detalhes sensíveis (URLs completas, tokens, etc)
   */
  private formatError(code: string, message: string, details?: string): AdapterError {
    // Remove informações sensíveis dos detalhes
    const safeDetails = details
      ? details
          .replace(/Bearer\s+[a-zA-Z0-9-._~+/]+=*/g, '[REDACTED_TOKEN]')
          .replace(/access_token=[^&]*/g, '[REDACTED_TOKEN]')
          .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[REDACTED_CPF]') // CPF
      : undefined;

    return {
      code,
      message,
      details: safeDetails,
    };
  }
}
