import type { FinancialSummary } from './financial-service.js';

export type FinancialIntent = 'payment' | 'renegotiation' | 'other';

export type AutomatedResponse = {
  message: string;
  transferToHuman: boolean;
  keepOpen: boolean;
};

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function paymentLines(summary: FinancialSummary): string[] {
  return summary.openPayments.map((payment) => {
    const link = payment.bankSlipUrl ?? payment.invoiceUrl;
    const url = link ? ` Link: ${link}` : '';
    return `- ${currency.format(payment.value)} com vencimento em ${payment.dueDate}.${url}`;
  });
}

export function buildAutomatedResponse(
  intent: FinancialIntent,
  summary: FinancialSummary
): AutomatedResponse {
  if (intent === 'renegotiation') {
    return {
      message: 'Vou transferir seu atendimento para uma de nossas atendentes para conversarmos sobre as opções de renegociação. Um instante, por favor.',
      transferToHuman: true,
      keepOpen: true
    };
  }

  if (intent === 'other') {
    return {
      message: 'Vou transferir seu atendimento para uma atendente do setor financeiro. Um momento, por favor.',
      transferToHuman: true,
      keepOpen: true
    };
  }

  if (summary.openPayments.length === 0) {
    return {
      message: 'Não encontrei boletos em aberto no seu cadastro. Posso ajudar com outra informação?',
      transferToHuman: false,
      keepOpen: false
    };
  }

  const lines = paymentLines(summary).join('\n');
  const hasOverdue = summary.overduePayments.length > 0;
  const prefix = hasOverdue
    ? 'Identifiquei pendências em aberto no seu cadastro. O ideal é quitar todas para manter sua regularidade conosco:'
    : 'Localizei o boleto disponível para pagamento:';

  return {
    message: `${prefix}\n${lines}${hasOverdue ? '\nSe precisar unificar os valores, digite 2 para falar sobre renegociação de dívida.' : ''}`,
    transferToHuman: false,
    keepOpen: hasOverdue
  };
}