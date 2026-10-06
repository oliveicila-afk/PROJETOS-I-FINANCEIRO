/**
 * Script para verificar expiração de credenciais
 * Roda no workflow do GitHub Actions para notificar sobre expiração
 */

import { CredentialManager } from './credential-manager.js';
import 'dotenv/config';

function checkAsaasTokenExpiration(): void {
  const createdDate = process.env.ASAAS_TOKEN_CREATED_DATE;

  if (!createdDate) {
    console.log(
      '⚠️  ASAAS_TOKEN_CREATED_DATE não configurada. ' +
      'Configure para monitoramento automático de expiração.'
    );
    return;
  }

  const expirationInfo = CredentialManager.checkExpiration(
    createdDate,
    'ASAAS_API_TOKEN'
  );

  CredentialManager.logExpirationStatus(expirationInfo);

  // Exit com código 1 se está expirando em menos de 14 dias
  // Isso ativa o alerta de email no workflow
  if (expirationInfo.isExpiringSoon || expirationInfo.isExpired) {
    process.exit(1);
  }
}

// Executar verificação
checkAsaasTokenExpiration();
