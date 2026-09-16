import 'dotenv/config';

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser um numero inteiro entre 1 e 65535.');
}

export const config = {
  port,
  sellfluxApiUrl: process.env.SELLFLUX_API_URL ?? 'https://apis.sellflux.app/api/v1/flux-v2',
  sellfluxApiToken: process.env.SELLFLUX_API_TOKEN ?? '',
  sellfluxTemplateBoleto4431: Number(process.env.SELLFLUX_TEMPLATE_BOLETO_4431 ?? 0),
  sellfluxTemplateBoleto9325: Number(process.env.SELLFLUX_TEMPLATE_BOLETO_9325 ?? 0),
  asaasApiUrl: process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3',
  asaasApiToken: process.env.ASAAS_API_TOKEN ?? '',
  asaasWebhookToken: process.env.ASAAS_WEBHOOK_TOKEN ?? ''
} as const;