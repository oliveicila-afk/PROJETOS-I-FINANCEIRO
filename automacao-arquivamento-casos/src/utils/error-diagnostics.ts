/**
 * ErrorDiagnostics: Sistema automático de investigação e resolução de erros
 *
 * Responsabilidades:
 * - Investigar erros de API (HTTP status codes)
 * - Diagnosticar causa raiz (token, endpoint, permissão, etc)
 * - Tentar estratégias de resolução automática
 * - Registrar diagnóstico para relatório
 */

export interface DiagnosticResult {
  success: boolean;
  problem: string;
  diagnosis: string;
  resolution?: string;
  resolutionTried?: boolean;
  resolutionSuccess?: boolean;
  timestamp: string;
  details: Record<string, unknown>;
}

export class ErrorDiagnostics {
  /**
   * Investigar erro de autenticação/autorização
   */
  static async diagnoseAuthError(
    statusCode: number,
    errorMessage: string,
    endpoint: string,
    context: { caseId?: string; token?: string }
  ): Promise<DiagnosticResult> {
    const diagnosis: DiagnosticResult = {
      success: false,
      problem: `HTTP ${statusCode}: ${errorMessage}`,
      diagnosis: '',
      timestamp: new Date().toISOString(),
      details: {
        statusCode,
        errorMessage,
        endpoint,
      },
    };

    // Análise por status code
    if (statusCode === 401) {
      // 401: Unauthorized - pode ser token inválido OU endpoint errado

      if (endpoint.includes('/cases/')) {
        diagnosis.diagnosis =
          'Endpoint incorreto: /cases não existe na API Advbox. ' +
          'O Advbox diferencia entre /cases e /lawsuits. ' +
          'Para acessar um caso, use /lawsuits/{id}.';
        diagnosis.resolution = `Substituir endpoint de /cases para /lawsuits`;
        diagnosis.details.suggestedFix = 'Change endpoint from /cases to /lawsuits';
      } else if (context.token) {
        diagnosis.diagnosis =
          'Token pode estar inválido, expirado ou não autorizado para este recurso. ' +
          'Ou o caso está em um workspace diferente.';
        diagnosis.resolution = 'Validar token e workspace do caso';
        diagnosis.details.tokenStatus = 'INVALID_OR_EXPIRED';
      }
    } else if (statusCode === 404) {
      diagnosis.diagnosis =
        `Recurso não encontrado no endpoint ${endpoint}. ` +
        'O caso pode não existir ou o ID está em formato incorreto.';
      diagnosis.resolution = 'Validar que o case_id existe e está no formato correto';
      diagnosis.details.resourceStatus = 'NOT_FOUND';
    } else if (statusCode === 403) {
      diagnosis.diagnosis =
        'Acesso proibido. O token é válido, mas não tem permissão para acessar este recurso. ' +
        'Pode ser restrição de workspace ou permissão específica.';
      diagnosis.resolution = 'Verificar permissões do token e workspace do caso';
      diagnosis.details.permissionStatus = 'FORBIDDEN';
    } else if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
      diagnosis.diagnosis =
        'Erro no servidor da API Advbox. O problema não está no seu código.';
      diagnosis.resolution = 'Aguardar e fazer retry';
      diagnosis.details.serverStatus = 'DOWN_OR_UNSTABLE';
    } else {
      diagnosis.diagnosis =
        `Erro HTTP ${statusCode}: ${this.getHttpStatusDescription(statusCode)}`;
      diagnosis.resolution = 'Investigação manual necessária';
      diagnosis.details.requiresManualReview = true;
    }

    diagnosis.success = true;
    return diagnosis;
  }

  /**
   * Investigar erro de conectividade
   */
  static async diagnoseConnectivityError(
    error: Error,
    endpoint: string,
    context: { caseId?: string }
  ): Promise<DiagnosticResult> {
    const diagnosis: DiagnosticResult = {
      success: false,
      problem: `Erro de conectividade: ${error.message}`,
      diagnosis: '',
      timestamp: new Date().toISOString(),
      details: {
        errorMessage: error.message,
        endpoint,
      },
    };

    if (error.message.includes('ECONNREFUSED')) {
      diagnosis.diagnosis =
        'Conexão recusada. O servidor da API Advbox pode estar indisponível.';
      diagnosis.resolution = 'Verificar status do servidor e fazer retry';
      diagnosis.details.type = 'CONNECTION_REFUSED';
    } else if (error.message.includes('ETIMEDOUT') || error.message.includes('ENOTFOUND')) {
      diagnosis.diagnosis =
        'Timeout ou DNS não resolvido. Problema de rede ou servidor indisponível.';
      diagnosis.resolution = 'Aguardar e fazer retry automático';
      diagnosis.details.type = 'TIMEOUT_OR_DNS';
    } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
      diagnosis.diagnosis =
        'Erro de certificado SSL/TLS. Pode ser problema de rede corporativa ou servidor.';
      diagnosis.resolution = 'Verificar configuração de certificados';
      diagnosis.details.type = 'SSL_TLS_ERROR';
    } else {
      diagnosis.diagnosis =
        'Erro de conectividade indeterminado. Pode ser rede, servidor ou firewall.';
      diagnosis.resolution = 'Investigação manual necessária';
      diagnosis.details.type = 'UNKNOWN_CONNECTIVITY';
    }

    diagnosis.success = true;
    return diagnosis;
  }

  /**
   * Investigar erro de parsing/validação
   */
  static async diagnoseValidationError(
    error: Error,
    context: { endpoint?: string; caseId?: string; expectedFields?: string[] }
  ): Promise<DiagnosticResult> {
    const diagnosis: DiagnosticResult = {
      success: false,
      problem: `Erro de validação: ${error.message}`,
      diagnosis: '',
      timestamp: new Date().toISOString(),
      details: {
        errorMessage: error.message,
        context,
      },
    };

    if (error.message.includes('JSON')) {
      diagnosis.diagnosis =
        'A resposta da API não é JSON válido. ' +
        'Pode ser que o servidor retornou HTML de erro ou resposta truncada.';
      diagnosis.resolution = 'Verificar status HTTP e conteúdo da resposta';
      diagnosis.details.type = 'INVALID_JSON';
    } else if (context.expectedFields) {
      diagnosis.diagnosis =
        `Campos obrigatórios faltando na resposta: ${context.expectedFields.join(', ')}. ` +
        'A estrutura da API pode ter mudado.';
      diagnosis.resolution = 'Verificar documentação da API Advbox e atualizar mapping';
      diagnosis.details.type = 'MISSING_FIELDS';
      diagnosis.details.missingFields = context.expectedFields;
    } else {
      diagnosis.diagnosis =
        'Erro ao validar dados da resposta. Estrutura inesperada.';
      diagnosis.resolution = 'Investigação manual necessária';
      diagnosis.details.type = 'VALIDATION_ERROR';
    }

    diagnosis.success = true;
    return diagnosis;
  }

  /**
   * Gerar resumo de diagnóstico para relatório
   */
  static generateReport(diagnoses: DiagnosticResult[]): string {
    if (diagnoses.length === 0) {
      return '✅ Nenhum erro detectado durante execução.';
    }

    const report = diagnoses
      .map((d, i) => {
        const lines = [
          `\n📌 Problema ${i + 1}: ${d.problem}`,
          `🔍 Diagnóstico: ${d.diagnosis}`,
        ];

        if (d.resolution) {
          lines.push(`💡 Resolução: ${d.resolution}`);
        }

        if (d.resolutionTried) {
          lines.push(
            `✅ Tentativa de resolução: ${d.resolutionSuccess ? 'SUCESSO' : 'FALHOU'}`
          );
        }

        return lines.join('\n');
      })
      .join('\n');

    return report;
  }

  /**
   * Descrição de HTTP status codes
   */
  private static getHttpStatusDescription(code: number): string {
    const descriptions: Record<number, string> = {
      400: 'Requisição inválida',
      401: 'Não autorizado / Token inválido',
      403: 'Acesso proibido',
      404: 'Não encontrado',
      429: 'Rate limit excedido',
      500: 'Erro no servidor',
      502: 'Gateway inválido',
      503: 'Serviço indisponível',
      504: 'Gateway timeout',
    };

    return descriptions[code] || 'Erro desconhecido';
  }

  /**
   * Tentar estratégias alternativas de resolução
   */
  static async tryAlternativeStrategies(
    diagnosis: DiagnosticResult,
    callbacks: {
      tryWithDifferentEndpoint?: (endpoint: string) => Promise<boolean>;
      validateToken?: () => Promise<boolean>;
      retryRequest?: () => Promise<boolean>;
    }
  ): Promise<DiagnosticResult> {
    // Se diagnóstico sugere endpoint errado, tentar alternativa
    if (
      diagnosis.details.suggestedFix === 'Change endpoint from /cases to /lawsuits' &&
      callbacks.tryWithDifferentEndpoint
    ) {
      console.log('🔄 Tentando resolver com endpoint alternativo...');
      const success = await callbacks.tryWithDifferentEndpoint('/lawsuits');
      diagnosis.resolutionTried = true;
      diagnosis.resolutionSuccess = success;

      if (success) {
        diagnosis.resolution = 'RESOLVIDO: Endpoint corrigido para /lawsuits';
      }
    }

    // Se diagnóstico sugere token inválido, validar
    if (
      diagnosis.details.tokenStatus === 'INVALID_OR_EXPIRED' &&
      callbacks.validateToken
    ) {
      console.log('🔄 Validando token...');
      const isValid = await callbacks.validateToken();
      diagnosis.resolutionTried = true;
      diagnosis.resolutionSuccess = isValid;
    }

    // Se for erro temporário, tentar retry
    if (
      (diagnosis.details.type === 'TIMEOUT_OR_DNS' ||
        diagnosis.details.serverStatus === 'DOWN_OR_UNSTABLE') &&
      callbacks.retryRequest
    ) {
      console.log('🔄 Tentando retry automático...');
      const success = await callbacks.retryRequest();
      diagnosis.resolutionTried = true;
      diagnosis.resolutionSuccess = success;
    }

    return diagnosis;
  }
}
