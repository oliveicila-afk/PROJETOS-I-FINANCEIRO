import 'dotenv/config';

const port = Number(process.env.PORT ?? 3000);

export type BoletoChannel = {
  name: 'reserva' | 'principal';
  phone: string;
  templateId: number;
};

function requiredPositiveInteger(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} deve ser um inteiro positivo.`);
  }
  return parsed;
}

export const config = {
  port,
  asaasApiUrl: process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3',
  sellfluxApiToken: process.env.SELLFLUX_API_TOKEN ?? '',
  asaasApiToken: process.env.ASAAS_API_TOKEN ?? '',
  asaasWebhookToken: process.env.ASAAS_WEBHOOK_TOKEN ?? '',
  boletoChannels: [
    {
      name: 'reserva',
      phone: process.env.BOLETO_RESERVA_PHONE ?? '+5592982904431',
      templateId: requiredPositiveInteger(process.env.BOLETO_RESERVA_TEMPLATE_ID ?? '2247586429353924', 'BOLETO_RESERVA_TEMPLATE_ID')
    },
    {
      name: 'principal',
      phone: process.env.BOLETO_PRINCIPAL_PHONE ?? '+5592981799325',
      templateId: requiredPositiveInteger(process.env.BOLETO_PRINCIPAL_TEMPLATE_ID ?? '1086798570956908', 'BOLETO_PRINCIPAL_TEMPLATE_ID')
    }
  ] as BoletoChannel[]
} as const;

export function getBoletoChannel(phone: string): BoletoChannel {
  const channel = config.boletoChannels.find((item) => item.phone === phone);
  if (!channel) throw new Error(`Remetente de boleto nao configurado: ${phone}.`);
  return channel;
}
