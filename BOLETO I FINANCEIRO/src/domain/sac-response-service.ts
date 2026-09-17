import type { AsaasCustomer, AsaasPayment } from '../integrations/asaas.js';

export function buildSACResponse(
  customer: AsaasCustomer,
  openPayments: AsaasPayment[],
  overduePayments: AsaasPayment[]
): string {
  if (overduePayments.length === 0 && openPayments.length === 0) {
    return `Olá ${customer.name}! 👋\n\nNão encontramos boletos pendentes no seu cadastro. Se tiver dúvidas, entre em contato conosco.`;
  }

  let response = `Olá ${customer.name}! 👋\n\n`;

  if (overduePayments.length > 0) {
    response += `⚠️ *Boletos em atraso:*\n`;
    overduePayments.forEach((payment) => {
      const dueDate = new Date(payment.dueDate).toLocaleDateString('pt-BR');
      response += `• Vencimento: ${dueDate} | R$ ${(payment.value / 100).toFixed(2)}\n`;
    });
    response += `\n`;
  }

  if (openPayments.length > 0) {
    response += `📋 *Boletos a vencer:*\n`;
    openPayments.slice(0, 3).forEach((payment) => {
      const dueDate = new Date(payment.dueDate).toLocaleDateString('pt-BR');
      response += `• Vencimento: ${dueDate} | R$ ${(payment.value / 100).toFixed(2)}\n`;
    });
    if (openPayments.length > 3) {
      response += `... e mais ${openPayments.length - 3} boleto(s)\n`;
    }
    response += `\n`;
  }

  response += `Para acessar seus boletos ou fazer o pagamento, responda com sua opção:\n`;
  response += `1️⃣ Ver boletos\n`;
  response += `2️⃣ Fazer pagamento\n`;
  response += `3️⃣ Falar com atendente\n`;

  return response;
}
