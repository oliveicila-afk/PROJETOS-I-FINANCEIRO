import 'dotenv/config';

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

  return {
    apiUrl: process.env.ASAAS_API_URL || 'https://api.asaas.com/v3',
    apiKey,
  };
}
