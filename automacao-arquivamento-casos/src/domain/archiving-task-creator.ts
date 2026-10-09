/**
 * ArchivingTaskCreator - Cria e atribui tarefas de arquivamento no Advbox
 *
 * Padrão baseado no Crossel - cria uma "post" (tarefa) e atualiza o responsável
 * do processo no Advbox
 */

import { AdvBoxClient } from '../integrations/advbox-client.js';

export interface ArchivingTaskData {
  lawsuitId: string;
  clientName: string;
  clientCPF: string;
  processNumber: string;
  honorarios: {
    contratuais: number;
    sucumbenciais: number;
    exito: number;
    total: number;
  };
  resultado: 'ganho' | 'perdido' | 'distrato';
  dataArquivamento: string;
  notaFiscal?: string;
  observacoes?: string;
}

export interface TaskCreationResult {
  postId: string;
  clientName: string;
  responsible: string;
  taskCreated: boolean;
  message: string;
}

export class ArchivingTaskCreator {
  private advboxClient: AdvBoxClient;

  constructor() {
    this.advboxClient = new AdvBoxClient();
  }

  /**
   * Create archiving task and assign to Gabi
   * Steps:
   * 1. Update lawsuit responsible to 'Gabi'
   * 2. Create post (task) with protocol details
   * 3. Return result with task ID
   */
  async createAndAssignTask(data: ArchivingTaskData): Promise<TaskCreationResult> {
    try {
      console.log(`[ArchivingTaskCreator] Criando tarefa para ${data.clientName}...`);

      // Step 1: Update lawsuit responsible
      console.log(`[ArchivingTaskCreator] Atualizando responsável do processo...`);
      await this.advboxClient.updateLawsuit(data.lawsuitId, {
        responsible: 'Gabi'
      });

      // Step 2: Create post (task) with protocol content
      const taskContent = this.generateProtocolContent(data);

      console.log(`[ArchivingTaskCreator] Criando post/tarefa com protocolo...`);
      const postResult = await this.advboxClient.createPost({
        lawsuit_id: data.lawsuitId,
        responsible: 'Gabi',
        title: 'PROTOCOLO DE ARQUIVAMENTO – OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS',
        content: taskContent,
        status: 'pending'
      });

      console.log(`[ArchivingTaskCreator] ✅ Tarefa criada com sucesso!`);
      console.log(`[ArchivingTaskCreator] Post ID: ${postResult.id || 'gerado automaticamente'}`);

      return {
        postId: postResult.id || 'created',
        clientName: data.clientName,
        responsible: 'Gabi',
        taskCreated: true,
        message: `Tarefa de arquivamento criada para ${data.clientName} e atribuída a Gabi`
      };
    } catch (error) {
      console.error('[ArchivingTaskCreator] ❌ Erro ao criar tarefa:', error);
      throw new Error(
        `Falha ao criar tarefa de arquivamento: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate protocol content with all archiving details
   */
  private generateProtocolContent(data: ArchivingTaskData): string {
    const cpfMasked = this.maskCPF(data.clientCPF);

    const content = `PROTOCOLO DE ARQUIVAMENTO

CLIENTE: ${data.clientName}
CPF: ${cpfMasked}
PROCESSO: ${data.processNumber}
DATA: ${data.dataArquivamento}

RESULTADO: ${this.translateResult(data.resultado)}

HONORÁRIOS:
- Contratuais: R$ ${data.honorarios.contratuais.toFixed(2)}
- Sucumbenciais: R$ ${data.honorarios.sucumbenciais.toFixed(2)}
- Êxito: R$ ${data.honorarios.exito.toFixed(2)}
- TOTAL: R$ ${data.honorarios.total.toFixed(2)}

${data.notaFiscal ? `NOTA FISCAL: ${data.notaFiscal}\n` : ''}

OBSERVAÇÕES:
${data.observacoes || 'Nenhuma observação registrada'}

STATUS: Pronto para arquivamento
RESPONSÁVEL: Gabi
APROVADO POR: Sistema de Automação

✅ Todas as obrigações foram integralmente cumpridas.
`;

    return content;
  }

  /**
   * Mask CPF showing only last 3 digits
   */
  private maskCPF(cpf: string): string {
    if (!cpf || cpf.length < 3) return cpf;
    return `${'*'.repeat(cpf.length - 3)}${cpf.slice(-3)}`;
  }

  /**
   * Translate result code to Portuguese
   */
  private translateResult(resultado: string): string {
    const translations: Record<string, string> = {
      'ganho': '✅ GANHO',
      'perdido': '❌ PERDIDO',
      'distrato': '📋 DISTRATO'
    };
    return translations[resultado] || resultado;
  }
}
