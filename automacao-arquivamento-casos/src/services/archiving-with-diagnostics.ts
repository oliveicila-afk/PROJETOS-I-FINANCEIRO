/**
 * ArchivingWithDiagnostics: Wrapper que adiciona diagnóstico automático
 *
 * Responsabilidades:
 * - Capturar erros durante arquivamento
 * - Executar diagnóstico automático
 * - Tentar estratégias de resolução
 * - Gerar relatório com diagnóstico
 * - Enviar relatório por email
 */

import { ErrorDiagnostics, DiagnosticResult } from '../utils/error-diagnostics.js';
import { DiagnosticReport } from '../domain/diagnostic-report.js';

export interface ArchivingWithDiagnosticsConfig {
  enableAutoResolution?: boolean;
  enableEmailReport?: boolean;
  emailAddress?: string;
}

export class ArchivingWithDiagnostics {
  private config: ArchivingWithDiagnosticsConfig;

  constructor(config: ArchivingWithDiagnosticsConfig = {}) {
    this.config = {
      enableAutoResolution: config.enableAutoResolution ?? true,
      enableEmailReport: config.enableEmailReport ?? true,
      ...config,
    };
  }

  /**
   * Executar função com captura de diagnóstico
   */
  async executeWithDiagnostics<T>(
    executionId: string,
    caseId: string,
    clientName: string,
    clientCPF: string,
    processNumber: string | null,
    callback: () => Promise<{ result: T; taskId?: string; protocolContent?: string }>
  ): Promise<{
    success: boolean;
    result?: T;
    report: DiagnosticReport;
  }> {
    const startTime = Date.now();
    const report = new DiagnosticReport(executionId, caseId, clientName, clientCPF, processNumber);

    try {
      console.log(`[Diagnostics] Iniciando execução ${executionId} para caso ${caseId}...`);

      const { result, taskId, protocolContent } = await callback();

      const duration = Date.now() - startTime;
      report.setDuration(duration);

      if (taskId && protocolContent) {
        report.markSuccess(taskId, protocolContent);
      }

      console.log(`[Diagnostics] ✅ Execução concluída com sucesso em ${duration}ms`);

      return {
        success: true,
        result,
        report,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      report.setDuration(duration);

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Diagnostics] ❌ Erro durante execução: ${errorMessage}`);

      // Tentar extrair informações de diagnóstico do erro
      const diagnostic = await this.extractDiagnosticFromErrorAsync(
        error,
        caseId,
        errorMessage
      );

      report.addDiagnostic(diagnostic);

      // Se configurado, tentar resolver automaticamente
      if (this.config.enableAutoResolution) {
        console.log(`[Diagnostics] 🔄 Tentando resolver automaticamente...`);

        const resolvedDiagnostic = await ErrorDiagnostics.tryAlternativeStrategies(
          diagnostic,
          {
            tryWithDifferentEndpoint: async (endpoint) => {
              try {
                // Tentar novamente com endpoint alternativo
                // Isso será implementado no próximo passo
                console.log(`[Diagnostics] Tentando com endpoint alternativo: ${endpoint}`);
                return true; // Placeholder
              } catch (e) {
                return false;
              }
            },
            validateToken: async () => {
              // Implementar validação de token
              console.log(`[Diagnostics] Validando token...`);
              return true; // Placeholder
            },
            retryRequest: async () => {
              try {
                // Tentar executar novamente
                await callback();
                return true;
              } catch (e) {
                return false;
              }
            },
          }
        );

        report.addDiagnostic(resolvedDiagnostic);
      }

      // Adicionar erro ao relatório
      report.addError(`${errorMessage}`);

      // Se configurado, enviar relatório por email
      if (this.config.enableEmailReport && this.config.emailAddress) {
        console.log(`[Diagnostics] 📧 Gerando relatório para email...`);
        await this.sendReportByEmail(report);
      }

      return {
        success: false,
        report,
      };
    }
  }

  /**
   * Extrair informações de diagnóstico do erro
   */
  private async extractDiagnosticFromErrorAsync(
    error: unknown,
    caseId: string,
    errorMessage: string
  ): Promise<DiagnosticResult> {
    const timestamp = new Date().toISOString();

    // Se o erro contiver informações de diagnóstico (de advbox-client)
    if (errorMessage.includes('Diagnóstico:')) {
      try {
        const diagnosticMatch = errorMessage.match(/Diagnóstico: ({.*})/);
        if (diagnosticMatch) {
          const diagnosticInfo = JSON.parse(diagnosticMatch[1]);

          if (diagnosticInfo.statusCode === 401) {
            return await ErrorDiagnostics.diagnoseAuthError(
              diagnosticInfo.statusCode,
              diagnosticInfo.statusText,
              diagnosticInfo.endpoint,
              { caseId }
            );
          }
        }
      } catch (e) {
        // Continuar com diagnóstico genérico
      }
    }

    // Diagnóstico genérico baseado no tipo de erro
    if (error instanceof Error) {
      return await ErrorDiagnostics.diagnoseConnectivityError(
        error,
        `case/${caseId}`,
        { caseId }
      );
    }

    // Default: erro desconhecido
    return {
      success: true,
      problem: errorMessage,
      diagnosis: 'Erro desconhecido durante execução',
      resolution: 'Verifique os logs e tente novamente',
      timestamp,
      details: { errorMessage },
    };
  }

  /**
   * Enviar relatório por email
   */
  private async sendReportByEmail(report: DiagnosticReport): Promise<void> {
    try {
      const htmlContent = report.generateEmailReport();
      const textContent = report.generateTextReport();
      const data = report.getData();

      console.log(
        `[Diagnostics] Preparando email: ${data.clientName} | ${data.caseId}`
      );

      // Placeholder: implementar envio de email
      // Pode usar: SendGrid, AWS SES, Nodemailer, etc.

      console.log(
        `[Diagnostics] ✅ Relatório preparado para envio por email`
      );
    } catch (error) {
      console.error(
        `[Diagnostics] ❌ Erro ao preparar relatório para email:`,
        error
      );
    }
  }

  /**
   * Obter relatório em texto simples (para logging)
   */
  getReportAsText(report: DiagnosticReport): string {
    return report.generateTextReport();
  }

  /**
   * Obter relatório em HTML (para email)
   */
  getReportAsHtml(report: DiagnosticReport): string {
    return report.generateEmailReport();
  }
}

/**
 * Instância global para facilitar uso
 */
let globalArchivingWithDiagnostics: ArchivingWithDiagnostics | null = null;

export function getArchivingWithDiagnostics(
  config?: ArchivingWithDiagnosticsConfig
): ArchivingWithDiagnostics {
  if (!globalArchivingWithDiagnostics) {
    globalArchivingWithDiagnostics = new ArchivingWithDiagnostics(config);
  }
  return globalArchivingWithDiagnostics;
}

export function resetArchivingWithDiagnostics(): void {
  globalArchivingWithDiagnostics = null;
}
