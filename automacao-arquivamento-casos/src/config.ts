import 'dotenv/config';
import { CredentialManager } from './utils/credential-manager.js';

export interface AdvBoxConfig {
  apiUrl: string;
  token: string;
  maskSensitiveData: boolean;
  userIds: {
    priscila: string; // User ID of task creator
    gabi: string;     // User ID of responsible for archiving
    anderson: string; // User ID of responsible for legal
  };
  taskTypeId: string; // ID for "ARQUIVAMENTO DEFINITIVO DE CLIENTE"
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

  const priscilaId = process.env.ADVBOX_USER_ID_PRISCILA;
  const gabiId = process.env.ADVBOX_USER_ID_GABI;
  const andersonId = process.env.ADVBOX_USER_ID_ANDERSON;
  const taskTypeId = process.env.ADVBOX_TASK_TYPE_ID_ARQUIVAMENTO;

  if (!priscilaId || !gabiId || !andersonId) {
    console.warn(
      'ℹ️  User IDs not yet configured. Please provide:',
      '\n  - ADVBOX_USER_ID_PRISCILA (task creator)',
      '\n  - ADVBOX_USER_ID_GABI (archiving responsible)',
      '\n  - ADVBOX_USER_ID_ANDERSON (legal responsible)'
    );
  }

  return {
    apiUrl: process.env.ADVBOX_API_URL || 'https://app.advbox.com.br/api/v1',
    token,
    maskSensitiveData: process.env.MASK_CPF === 'true',
    userIds: {
      priscila: priscilaId || 'PENDING',
      gabi: gabiId || 'PENDING',
      anderson: andersonId || 'PENDING',
    },
    taskTypeId: taskTypeId || 'PENDING',
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

// Export combined config object for convenience
export const config = {
  advbox: getAdvBoxConfig(),
  asaas: getAsaasConfig(),
};
