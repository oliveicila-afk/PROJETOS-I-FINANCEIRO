import type { AsaasCustomer } from '../integrations/asaas.js';
import type { AsaasPayment } from '../integrations/asaas.js';
import type { SellfluxClient } from '../integrations/sellflux.js';

export type BoletoTemplateData = {
  nome: string;
  vencimento: string;
  link_boleto: string;
};

export function buildBoletoTemplateData(
  customer: AsaasCustomer,
  payments: AsaasPayment[]
): BoletoTemplateData {
  const withLinks = payments.filter((payment) => payment.bankSlipUrl ?? payment.invoiceUrl);
  if (withLinks.length === 0) {
    throw new Error('Nenhum boleto com link disponível para envio.');
  }

  return {
    nome: customer.name,
    vencimento: withLinks.map((payment) => payment.dueDate).join(', '),
    link_boleto: withLinks.map((payment) => payment.bankSlipUrl ?? payment.invoiceUrl).join('\n')
  };
}

export async function sendBoletoTemplate(
  sellflux: Pick<SellfluxClient, 'sendWhatsAppTemplate'>,
  phone: string,
  templateId: number,
  customer: AsaasCustomer,
  payments: AsaasPayment[]
): Promise<unknown> {
  const data = buildBoletoTemplateData(customer, payments);
  return sellflux.sendWhatsAppTemplate({ phone, templateId, data });
}