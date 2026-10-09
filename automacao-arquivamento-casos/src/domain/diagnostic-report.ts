/**
 * DiagnosticReport: Estrutura de relatório que inclui diagnóstico de erros
 *
 * Usado para:
 * - Registrar execução da automação
 * - Incluir qualquer problema encontrado e resolvido
 * - Gerar relatório para enviar por email
 */

import { DiagnosticResult } from '../utils/error-diagnostics.js';

export interface DiagnosticReportData {
  // Informações básicas
  executionId: string;
  timestamp: string;
  status: 'success' | 'success_with_warnings' | 'failed';
  duration: number; // milliseconds

  // Informações do caso
  caseId: string;
  clientName: string;
  clientCPF: string;
  processNumber: string | null;

  // Diagnósticos (se houver)
  diagnostics: DiagnosticResult[];
  diagnosticSummary: string;

  // Resultado da execução
  taskCreatedId?: string;
  protocolContent?: string;

  // Alertas
  warnings: string[];
  errors: string[];
}

export class DiagnosticReport {
  private data: DiagnosticReportData;

  constructor(
    executionId: string,
    caseId: string,
    clientName: string,
    clientCPF: string,
    processNumber: string | null = null
  ) {
    this.data = {
      executionId,
      timestamp: new Date().toISOString(),
      status: 'success',
      duration: 0,
      caseId,
      clientName,
      clientCPF,
      processNumber,
      diagnostics: [],
      diagnosticSummary: '',
      warnings: [],
      errors: [],
    };
  }

  /**
   * Adicionar diagnóstico
   */
  addDiagnostic(diagnostic: DiagnosticResult): void {
    this.data.diagnostics.push(diagnostic);

    // Atualizar status se houver erro não resolvido
    if (!diagnostic.resolutionSuccess && diagnostic.resolutionTried) {
      this.data.status = 'failed';
    } else if (!diagnostic.resolutionTried && diagnostic.resolutionSuccess !== true) {
      // Problema detectado mas não tentou resolver
      if (this.data.status !== 'failed') {
        this.data.status = 'success_with_warnings';
      }
    }
  }

  /**
   * Adicionar warning
   */
  addWarning(warning: string): void {
    this.data.warnings.push(warning);
    if (this.data.status === 'success') {
      this.data.status = 'success_with_warnings';
    }
  }

  /**
   * Adicionar erro
   */
  addError(error: string): void {
    this.data.errors.push(error);
    this.data.status = 'failed';
  }

  /**
   * Marcar sucesso
   */
  markSuccess(taskId: string, protocolContent: string): void {
    this.data.taskCreatedId = taskId;
    this.data.protocolContent = protocolContent;
    if (this.data.status === 'success' || this.data.status === 'success_with_warnings') {
      this.data.status = 'success_with_warnings';
    }
  }

  /**
   * Definir duração
   */
  setDuration(ms: number): void {
    this.data.duration = ms;
  }

  /**
   * Gerar relatório em HTML para email
   */
  generateEmailReport(): string {
    const statusEmoji = this.getStatusEmoji();
    const statusText = this.getStatusText();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
    .status { font-size: 24px; font-weight: bold; color: ${this.getStatusColor()}; }
    .section { margin-top: 20px; padding: 15px; border-left: 4px solid #0066cc; background: #f9f9f9; }
    .section h3 { margin-top: 0; color: #0066cc; }
    .diagnostic { margin: 10px 0; padding: 10px; background: #fff; border-left: 3px solid #ff9800; }
    .diagnostic.resolved { border-left-color: #4caf50; }
    .diagnostic-title { font-weight: bold; }
    .diagnostic-text { margin: 5px 0 0 0; color: #666; }
    .warning-box { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin: 10px 0; border-radius: 3px; }
    .error-box { background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; margin: 10px 0; border-radius: 3px; }
    .success-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 10px; margin: 10px 0; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
    th { background: #f0f0f0; }
    .timestamp { color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="status">${statusEmoji} ${statusText}</div>
      <p><strong>Execução ID:</strong> ${this.data.executionId}</p>
      <p><strong>Data/Hora:</strong> ${new Date(this.data.timestamp).toLocaleString('pt-BR')}</p>
      <p><strong>Duração:</strong> ${this.data.duration}ms</p>
    </div>

    <div class="section">
      <h3>📋 Informações do Caso</h3>
      <table>
        <tr>
          <th>Campo</th>
          <th>Valor</th>
        </tr>
        <tr>
          <td>ID do Caso</td>
          <td>${this.data.caseId}</td>
        </tr>
        <tr>
          <td>Cliente</td>
          <td>${this.data.clientName}</td>
        </tr>
        <tr>
          <td>CPF (mascarado)</td>
          <td>${this.maskCPF(this.data.clientCPF)}</td>
        </tr>
        <tr>
          <td>Número do Processo</td>
          <td>${this.data.processNumber || 'Não encontrado'}</td>
        </tr>
      </table>
    </div>

    ${
      this.data.diagnostics.length > 0
        ? `
    <div class="section">
      <h3>🔍 Diagnósticos</h3>
      ${this.data.diagnostics
        .map(
          (d) => `
      <div class="diagnostic ${d.resolutionSuccess ? 'resolved' : ''}">
        <div class="diagnostic-title">
          ${d.resolutionSuccess ? '✅ Resolvido' : '⚠️ Problema'}: ${d.problem}
        </div>
        <div class="diagnostic-text">
          <strong>Diagnóstico:</strong> ${d.diagnosis}
        </div>
        ${
          d.resolution
            ? `<div class="diagnostic-text"><strong>Resolução:</strong> ${d.resolution}</div>`
            : ''
        }
        ${
          d.resolutionTried
            ? `<div class="diagnostic-text"><strong>Tentativa:</strong> ${d.resolutionSuccess ? 'SUCESSO ✅' : 'FALHOU ❌'}</div>`
            : ''
        }
      </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    ${
      this.data.warnings.length > 0
        ? `
    <div class="section">
      <h3>⚠️ Avisos</h3>
      ${this.data.warnings
        .map((w) => `<div class="warning-box">${w}</div>`)
        .join('')}
    </div>
    `
        : ''
    }

    ${
      this.data.errors.length > 0
        ? `
    <div class="section">
      <h3>❌ Erros</h3>
      ${this.data.errors
        .map((e) => `<div class="error-box">${e}</div>`)
        .join('')}
    </div>
    `
        : ''
    }

    ${
      this.data.taskCreatedId
        ? `
    <div class="section">
      <h3>✅ Resultado</h3>
      <div class="success-box">
        <strong>Tarefa criada com sucesso!</strong><br>
        ID da Tarefa: ${this.data.taskCreatedId}
      </div>
    </div>
    `
        : ''
    }

    <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
      <p>Relatório gerado automaticamente pela Automação de Arquivamento de Casos</p>
      <p class="timestamp">${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Gerar relatório em texto simples
   */
  generateTextReport(): string {
    let report = '';

    report += `RELATÓRIO DE AUTOMAÇÃO DE ARQUIVAMENTO\n`;
    report += `=====================================\n\n`;

    report += `Status: ${this.getStatusEmoji()} ${this.getStatusText()}\n`;
    report += `Data/Hora: ${new Date(this.data.timestamp).toLocaleString('pt-BR')}\n`;
    report += `Duração: ${this.data.duration}ms\n`;
    report += `Execução ID: ${this.data.executionId}\n\n`;

    report += `INFORMAÇÕES DO CASO\n`;
    report += `------------------\n`;
    report += `ID do Caso: ${this.data.caseId}\n`;
    report += `Cliente: ${this.data.clientName}\n`;
    report += `CPF: ${this.maskCPF(this.data.clientCPF)}\n`;
    report += `Número do Processo: ${this.data.processNumber || 'Não encontrado'}\n\n`;

    if (this.data.diagnostics.length > 0) {
      report += `DIAGNÓSTICOS\n`;
      report += `------------\n`;
      this.data.diagnostics.forEach((d, i) => {
        report += `\n${i + 1}. ${d.problem}\n`;
        report += `   Diagnóstico: ${d.diagnosis}\n`;
        if (d.resolution) {
          report += `   Resolução: ${d.resolution}\n`;
        }
        if (d.resolutionTried) {
          report += `   Resultado: ${d.resolutionSuccess ? 'SUCESSO ✅' : 'FALHOU ❌'}\n`;
        }
      });
      report += '\n';
    }

    if (this.data.warnings.length > 0) {
      report += `AVISOS\n`;
      report += `------\n`;
      this.data.warnings.forEach((w) => {
        report += `⚠️  ${w}\n`;
      });
      report += '\n';
    }

    if (this.data.errors.length > 0) {
      report += `ERROS\n`;
      report += `-----\n`;
      this.data.errors.forEach((e) => {
        report += `❌ ${e}\n`;
      });
      report += '\n';
    }

    if (this.data.taskCreatedId) {
      report += `RESULTADO\n`;
      report += `---------\n`;
      report += `✅ Tarefa criada com sucesso!\n`;
      report += `ID da Tarefa: ${this.data.taskCreatedId}\n`;
    }

    return report;
  }

  /**
   * Obter dados do relatório
   */
  getData(): DiagnosticReportData {
    return this.data;
  }

  // Utilitários privados
  private getStatusEmoji(): string {
    switch (this.data.status) {
      case 'success':
        return '✅';
      case 'success_with_warnings':
        return '⚠️';
      case 'failed':
        return '❌';
    }
  }

  private getStatusText(): string {
    switch (this.data.status) {
      case 'success':
        return 'SUCESSO';
      case 'success_with_warnings':
        return 'SUCESSO COM AVISOS';
      case 'failed':
        return 'FALHA';
    }
  }

  private getStatusColor(): string {
    switch (this.data.status) {
      case 'success':
        return '#4caf50';
      case 'success_with_warnings':
        return '#ff9800';
      case 'failed':
        return '#f44336';
    }
  }

  private maskCPF(cpf: string): string {
    if (!cpf || cpf.length < 3) return cpf;
    return `${'*'.repeat(cpf.length - 3)}${cpf.slice(-3)}`;
  }
}
