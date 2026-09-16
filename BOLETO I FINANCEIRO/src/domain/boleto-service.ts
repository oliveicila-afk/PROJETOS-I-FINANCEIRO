import type { AsaasCustomer, AsaasPayment } from '../integrations/asaas.js';
import type { SellfluxClient } from '../integrations/sellflux.js';
import { getBoletoChannel } from '../config.js';

export type BoletoTemplateData = { nome: string; vencimento: string; link_boleto: string };

export function buildBoletoTemplateData(customer: AsaasCustomer, payments: AsaasPayment[]): BoletoTemplateData {
  const withLinks = payments.filter((payment) => payment.bankSlipUrl ?? payment.invoiceUrl);
  if (withLinks.length === 0) throw new Error('Nenhum boleto com link disponível para envio.');
  return {
    nome: customer.name,
    vencimento: withLinks.map((payment) => payment.dueDate).join(', '),
    link_boleto: withLinks.map((payment) => payment.bankSlipUrl ?? payment.invoiceUrl).join('\n')
  };
}

export async function sendBoletoTemplate(
  sellflux: Pick<SellfluxClient, 'sendWhatsAppTemplate'>,
  recipientPhone: string,
  senderPhone: string,
  customer: AsaasCustomer,
  payments: AsaasPayment[]
): Promise<unknown> {
  const channel = getBoletoChannel(senderPhone);
  return sellflux.sendWhatsAppTemplate({
    phone: recipientPhone,
    templateId: channel.templateId,
    data: buildBoletoTemplateData(customer, payments)
  });
}
