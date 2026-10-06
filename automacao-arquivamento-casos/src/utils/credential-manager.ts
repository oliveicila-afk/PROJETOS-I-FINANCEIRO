/**
 * Gerenciador de credenciais com monitoramento de expiração
 *
 * A chave API do Asaas expira a cada 3 meses
 * Este módulo detecta expiração e oferece mensagens claras de ação
 */

export interface CredentialExpirationInfo {
  name: string;
  createdDate: Date;
  expiresDate: Date;
  daysUntilExpiration: number;
  isExpired: boolean;
  isExpiringSoon: boolean; // menos de 14 dias
}

export class CredentialManager {
  /**
   * Valida se uma chave está próxima de expirar
   * @param createdDateString Data de criação (formato: YYYY-MM-DD)
   * @param credentialName Nome da credencial (ex: "ASAAS_API_TOKEN")
   * @returns Informações sobre expiração
   */
  static checkExpiration(
    createdDateString: string,
    credentialName: string = "ASAAS_API_TOKEN"
  ): CredentialExpirationInfo {
    const createdDate = new Date(createdDateString);
    const expiresDate = new Date(createdDate);
    expiresDate.setMonth(expiresDate.getMonth() + 3);

    const now = new Date();
    const daysUntilExpiration = Math.ceil(
      (expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const info: CredentialExpirationInfo = {
      name: credentialName,
      createdDate,
      expiresDate,
      daysUntilExpiration,
      isExpired: now > expiresDate,
      isExpiringSoon: daysUntilExpiration <= 14 && daysUntilExpiration > 0,
    };

    return info;
  }

  /**
   * Log formatado sobre status de expiração
   */
  static logExpirationStatus(info: CredentialExpirationInfo): void {
    if (info.isExpired) {
      console.error(
        `\n❌ ERRO CRÍTICO: ${info.name} EXPIROU!\n` +
          `Expirada em: ${info.expiresDate.toLocaleDateString("pt-BR")}\n` +
          `AÇÃO IMEDIATA: Gere uma nova chave no Asaas e atualize o GitHub Secret\n` +
          `1. Acesse: https://app.asaas.com (painel do Asaas)\n` +
          `2. Gere uma nova chave API\n` +
          `3. Copie a nova chave\n` +
          `4. Atualize em: https://github.com/oliveicila-afk/PROJETOS-I-FINANCEIRO/settings/secrets/actions\n` +
          `5. Edite ${info.name} com a nova chave\n`
      );
    } else if (info.isExpiringSoon) {
      console.warn(
        `\n⚠️  AVISO: ${info.name} vence em ${info.daysUntilExpiration} dias!\n` +
          `Vence em: ${info.expiresDate.toLocaleDateString("pt-BR")}\n` +
          `AÇÃO RECOMENDADA: Gere uma nova chave em breve\n` +
          `1. Acesse: https://app.asaas.com (painel do Asaas)\n` +
          `2. Gere uma nova chave API\n` +
          `3. Guarde a data de hoje como "data de criação" da nova chave\n` +
          `4. Quando estiver pronto, atualize GitHub Secrets com a nova chave\n`
      );
    } else {
      console.log(
        `✅ ${info.name} válida até ${info.expiresDate.toLocaleDateString("pt-BR")} ` +
          `(${info.daysUntilExpiration} dias)`
      );
    }
  }

  /**
   * Detecta se um erro é causado por credencial inválida/expirada
   */
  static isAuthenticationError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("401") ||
        message.includes("unauthorized") ||
        message.includes("invalid") ||
        message.includes("token") ||
        message.includes("api key")
      );
    }
    return false;
  }

  /**
   * Mensagem helpful quando credencial falha
   */
  static getAuthErrorMessage(credentialName: string): string {
    return (
      `\n❌ Falha de autenticação com ${credentialName}\n` +
      `Possíveis causas:\n` +
      `1. Chave API expirou (Asaas renova a cada 3 meses)\n` +
      `2. Chave API foi revogada\n` +
      `3. Chave API foi copiada incorretamente\n\n` +
      `SOLUÇÃO:\n` +
      `1. Verifique a data de criação da chave atual\n` +
      `2. Se passou 3 meses, gere uma nova em: https://app.asaas.com\n` +
      `3. Atualize o GitHub Secret: https://github.com/oliveicila-afk/PROJETOS-I-FINANCEIRO/settings/secrets/actions\n` +
      `4. Na atualização, anote a data de criação para futuro monitoramento\n`
    );
  }
}
