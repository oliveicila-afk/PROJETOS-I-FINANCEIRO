import { ArchivingAdapter } from '../integrations/archiving-adapter.js';

export interface ArchivingReason {
  code: string;
  label: string;
  description: string;
}

export const ARCHIVING_REASONS: ArchivingReason[] = [
  { code: 'WON', label: 'Ganhamos o processo', description: 'Vitória judicial' },
  { code: 'LOST_COSTS', label: 'Perda por Falta de Custas', description: 'Extinção por falta de custas' },
  { code: 'UNFAVORABLE', label: 'Sentença Desfavorável', description: 'Decisão desfavorável' },
  { code: 'INERTIA', label: 'Extinção por Inércia', description: 'Caso arquivado por inércia' },
  { code: 'PRESCRIPTION', label: 'Prescrição ou Decadência', description: 'Direito prescrito/decadência' },
  { code: 'ILLEGITIMACY', label: 'Ilegitimidade', description: 'Falta de legitimidade ativa/passiva' },
  { code: 'SETTLEMENT', label: 'Acordo / Transação Homologada', description: 'Acordo fechado' },
  { code: 'OPERATIONAL_FAILURE', label: 'Falha Operacional / Prazo', description: 'Erro operacional interno' },
  { code: 'OTHER', label: 'Outros motivos', description: 'Outro motivo' },
];

export interface ArchivingInfo {
  caseId: string;
  clientName: string;
  clientCPF: string;
  processNumber: string | null;
  archivingReason: string;
  successValue: number | null;
  sucumbencialValue: number | null;
  hasMultipleActions: boolean;
  invoiceIssued: boolean;
  observations: string[];
  alerts: string[];
}

export class ArchivingService {
  constructor(private adapter: ArchivingAdapter) {}

  async collectArchivingInfo(caseId: string): Promise<ArchivingInfo> {
    console.log(`📋 Coletando informações de arquivamento para caso ${caseId}...`);

    // 1. Buscar informações básicas do caso
    const caseDetails = await this.adapter.getCaseDetails(caseId);
    console.log(`✅ Detalhes do caso obtidos`);

    // 2. Buscar tarefas (informativo de arquivamento)
    const tasks = await this.adapter.getCaseTasks(caseId);
    const archivingTask = tasks.find(t => t.title.includes('ARQUIVAMENTO'));
    console.log(`✅ Tarefas do caso obtidas (${tasks.length} tarefas)`);

    // 3. Buscar número do processo no Asaas
    const processNumber = await this.adapter.findProcessNumberByDescription(caseDetails.clientCPF);
    console.log(`✅ Número do processo: ${processNumber || 'não encontrado'}`);

    // 4. Verificar múltiplas ações do cliente
    const clientCases = await this.adapter.getClientCases(caseDetails.id);
    const hasMultipleActions = clientCases.length > 1;
    console.log(`✅ Verificação de múltiplas ações: ${hasMultipleActions ? 'ENCONTRADAS' : 'nenhuma outra'}`);

    // 5. Buscar sucumbencial em tarefas
    const sucumbencialValue = this.extractSucumbencialFromTasks(tasks);

    // 6. Preparar alertas
    const alerts: string[] = [];
    if (!processNumber) {
      alerts.push('⚠️ Número do processo não encontrado no Asaas - verificar manualmente');
    }
    if (hasMultipleActions) {
      alerts.push('⚠️ Cliente possui outras ações em andamento - VERIFICAR ANTES DE ARQUIVAR');
    }
    if (!archivingTask?.description) {
      alerts.push('⚠️ Informativo de arquivamento incompleto - entre em contato com controladoria');
    }

    const info: ArchivingInfo = {
      caseId,
      clientName: caseDetails.clientName,
      clientCPF: caseDetails.clientCPF,
      processNumber,
      archivingReason: archivingTask?.description || 'NÃO INFORMADO',
      successValue: caseDetails.successValue || null,
      sucumbencialValue,
      hasMultipleActions,
      invoiceIssued: false,
      observations: [],
      alerts,
    };

    return info;
  }

  async createArchivingProtocol(info: ArchivingInfo): Promise<string> {
    console.log(`📄 Criando protocolo de arquivamento...`);

    const protocolContent = `
PROTOCOLO DE ARQUIVAMENTO – OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS

=== RESUMO FINANCEIRO ===
Honorários contratuais iniciais: R$ ${info.successValue || 0}
Honorários sucumbenciais: R$ ${info.sucumbencialValue || 0}
Valor total de honorários: R$ ${(info.successValue || 0) + (info.sucumbencialValue || 0)}
Nota fiscal emitida: ${info.invoiceIssued ? 'Sim' : 'Não'}

=== INFORMAÇÕES DO CASO ===
Cliente: ${info.clientName}
CPF: ${this.maskCPF(info.clientCPF)}
Número do processo: ${info.processNumber || 'Não encontrado'}
Motivo de arquivamento: ${info.archivingReason}

=== MÚLTIPLAS AÇÕES ===
Cliente possui outras ações: ${info.hasMultipleActions ? 'Sim' : 'Não'}

=== OBSERVAÇÕES ===
${info.observations.map((o, i) => `${i + 1}. ${o}`).join('\n')}

=== ALERTAS ===
${info.alerts.length > 0 ? info.alerts.join('\n') : 'Nenhum alerta'}

=== CONFIRMAÇÃO FINAL ===
Não restam obrigações a serem cumpridas, estando todas integralmente satisfeitas.
Realizada a baixa e o arquivamento no ADVBOX.
    `;

    // Criar tarefa no Advbox para Gabi
    const task = await this.adapter.createArchivingProtocol(
      info.caseId,
      'PROTOCOLO DE ARQUIVAMENTO – OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS',
      protocolContent
    );

    console.log(`✅ Protocolo criado (Tarefa ID: ${task.id})`);

    return task.id;
  }

  private extractSucumbencialFromTasks(tasks: { description: string }[]): number | null {
    for (const task of tasks) {
      const match = task.description.match(/sucumbencial[:\s]R\$\s?([\d.,]+)/i);
      if (match) {
        const value = match[1].replace('.', '').replace(',', '.');
        return parseFloat(value);
      }
    }

    return null;
  }

  private maskCPF(cpf: string): string {
    // Mostra apenas últimos 3 dígitos: XXX.XXX.XXX-00
    if (!cpf || cpf.length < 3) return cpf;
    return `${'*'.repeat(cpf.length - 3)}${cpf.slice(-3)}`;
  }
}
