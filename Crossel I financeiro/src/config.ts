import 'dotenv/config';

export type Config = {
  advboxApiUrl: string;
  advboxApiToken: string;
  googleServiceAccountEmail?: string;
  googlePrivateKey?: string;
  googleDriveRootFolderId?: string;
  sellfluxSacApiUrl?: string;
  sellfluxApiToken?: string;
};

function requiredString(value: string | undefined, name: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`${name} é obrigatório e não pode estar vazio.`);
  }
  return value;
}

function optionalString(value: string | undefined): string | undefined {
  return value && value.trim() ? value.trim() : undefined;
}

const advboxApiUrl = requiredString(process.env.ADVBOX_API_URL, 'ADVBOX_API_URL');
const advboxApiToken = requiredString(process.env.ADVBOX_TOKEN, 'ADVBOX_TOKEN');

export const config: Config = {
  advboxApiUrl,
  advboxApiToken,
  googleServiceAccountEmail: optionalString(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
  googlePrivateKey: optionalString(process.env.GOOGLE_PRIVATE_KEY),
  googleDriveRootFolderId: optionalString(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID),
  sellfluxSacApiUrl: optionalString(process.env.SELLFLUX_SAC_API_URL) || 'https://apis.sellflux.app/api/v1',
  sellfluxApiToken: optionalString(process.env.SELLFLUX_API_TOKEN)
} as const;

export function getAdvBoxConfig() {
  return {
    apiUrl: config.advboxApiUrl,
    apiToken: config.advboxApiToken
  };
}

export function getGoogleDriveConfig() {
  if (!config.googleServiceAccountEmail || !config.googlePrivateKey || !config.googleDriveRootFolderId) {
    throw new Error('Google Drive não configurado. Configure GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY e GOOGLE_DRIVE_ROOT_FOLDER_ID');
  }

  return {
    serviceAccountEmail: config.googleServiceAccountEmail,
    privateKey: config.googlePrivateKey,
    rootFolderId: config.googleDriveRootFolderId
  };
}

export function getSellFluxSACConfig() {
  if (!config.sellfluxApiToken) {
    throw new Error('SellFlux SAC não configurado. Configure SELLFLUX_API_TOKEN');
  }

  return {
    apiUrl: config.sellfluxSacApiUrl || 'https://apis.sellflux.app/api/v1',
    apiToken: config.sellfluxApiToken
  };
}
