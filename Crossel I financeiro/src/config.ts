import 'dotenv/config';

export type Config = {
  advboxApiUrl: string;
  advboxApiToken: string;
};

function requiredString(value: string | undefined, name: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`${name} é obrigatório e não pode estar vazio.`);
  }
  return value;
}

const advboxApiUrl = requiredString(process.env.ADVBOX_API_URL, 'ADVBOX_API_URL');
const advboxApiToken = requiredString(process.env.ADVBOX_TOKEN, 'ADVBOX_TOKEN');

export const config: Config = {
  advboxApiUrl,
  advboxApiToken
} as const;

export function getAdvBoxConfig() {
  return {
    apiUrl: config.advboxApiUrl,
    apiToken: config.advboxApiToken
  };
}
