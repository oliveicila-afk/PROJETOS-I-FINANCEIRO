import 'dotenv/config';
import { CredentialManager } from './utils/credential-manager.js';

export interface AdvBoxConfig {
  apiUrl: string;
  token: string;
  maskSensitiveData: boolean;
}

export interface AsaasConfig {
  apiUrl: string;
  apiKey: string;
}

export function getAdvBoxConfig(): AdvBoxConfig {
  const token = process.env.ADVBOX_TOKEN;
  if (!token) {
    throw new Error('ADVBOX_TOKEN não configurado');
  }

  return {
    apiUrl: process.env.ADVBOX_API_URL || 'https://app.advbox.com.br/api/v1',
    token,
    maskSensitiveData: process.env.MASK_CPF === 'true',
  };
}

export function getAsaasConfig(): AsaasConfig {
  const apiKey = process.env.ASAAS_API_TOKEN;
  if (!apiKey) {
    throw new Error('ASAAS_API_TOKEN não configurado');
  }

  // Valida expiração da chave se a data de criação estiver informada
  const asaasCreatedDate = process.env.ASAAS_TOKEN_CREATED_DATE;
  if (asaasCreatedDate) {
    const expirationInfo = CredentialManager.checkExpiration(
      asaasCreatedDate,
      'ASAAS_API_TOKEN'
    );
    CredentialManager.logExpirationStatus(expirationInfo);
  }

  return {
    apiUrl: process.env.ASAAS_API_URL || 'https://api.asaas.com/v3',
    apiKey,
  };
}
