export const BEMOL_PJ_CNPJ = '35410271000108';
export const BEMOL_FINANCIAL_TASK_NAME = 'COMUN. FINANCEIRO | FECHAMENTO BEMOL';

export type BemolPaymentInput = {
  payerName: string;
  payerPhone?: string;
  payerRelationship?: string;
  contractorName: string;
  contractorPhone?: string;
  closingDate: string;
  totalAmount: number;
  pixAmount?: number;
  creditCardAmount?: number;
  creditCardInstallments?: number;
  bemolAmount: number;
};

export type BemolPaymentAttribution = {
  sourceCnpj: string;
  contractorName: string;
  payer: { name: string; phone?: string; relationship?: string };
  financialLaunch: { amount: number; paymentMethod: 'BEMOL'; generateCharge: false; customerName: string };
  financialTask: { name: string; assignees: ['Priscila Santos', 'Gabriele Nascimento']; description: string };
};

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} e obrigatorio.`);
  return normalized;
}

function money(value: number | undefined): string {
  return (value ?? 0).toFixed(2).replace('.', ',');
}

export function isBemolPayment(sourceCnpj: string): boolean {
  return sourceCnpj.replace(/\D/g, '') === BEMOL_PJ_CNPJ;
}

export function buildBemolPaymentAttribution(sourceCnpj: string, input: BemolPaymentInput): BemolPaymentAttribution {
  if (!isBemolPayment(sourceCnpj)) throw new Error('Pagamento nao pertence a origem Bemol configurada.');
  const payerName = requiredText(input.payerName, 'Nome do pagador Bemol');
  const contractorName = requiredText(input.contractorName, 'Nome do cliente contratante');
  if (!Number.isFinite(input.bemolAmount) || input.bemolAmount <= 0) throw new Error('Valor pago via Bemol deve ser maior que zero.');
  if (!Number.isFinite(input.totalAmount) || input.totalAmount < input.bemolAmount) throw new Error('Valor total do fechamento deve cobrir o pagamento Bemol.');

  const description = [
    '1. DADOS DO FECHAMENTO',
    `- Cliente Contratante: ${contractorName}`,
    `- Data do Fechamento: ${requiredText(input.closingDate, 'Data do fechamento')}`,
    `- Valor Total do Fechamento: R$ ${money(input.totalAmount)}`,
    '',
    '2. DETALHAMENTO DAS FORMAS DE PAGAMENTO',
    `- Entrada no Pix/A vista: R$ ${money(input.pixAmount)}`,
    `- Cartao de Credito: R$ ${money(input.creditCardAmount)} em ${input.creditCardInstallments ?? 0}x`,
    `- Pagamento via Bemol: R$ ${money(input.bemolAmount)}`,
    '',
    '3. DADOS DO PAGADOR BEMOL',
    `- Nome Cadastrado na Bemol: ${payerName}`,
    `- Vinculo com o Cliente: ${input.payerRelationship?.trim() || 'Nao informado'}`,
    `- Telefone/WhatsApp do Pagador: ${input.payerPhone?.trim() || 'Nao informado'}`,
    '',
    '4. ENVOLVIDOS E CONTATOS NO ADVBOX',
    `- Cliente Principal: ${contractorName} - ${input.contractorPhone?.trim() || 'Nao informado'}`,
    `- Pagador/Intermediario: ${payerName} - ${input.payerPhone?.trim() || 'Nao informado'} - ${input.payerRelationship?.trim() || 'Nao informado'}`
  ].join('\n');

  return {
    sourceCnpj: BEMOL_PJ_CNPJ,
    contractorName,
    payer: { name: payerName, phone: input.payerPhone?.trim(), relationship: input.payerRelationship?.trim() },
    financialLaunch: { amount: input.bemolAmount, paymentMethod: 'BEMOL', generateCharge: false, customerName: contractorName },
    financialTask: { name: BEMOL_FINANCIAL_TASK_NAME, assignees: ['Priscila Santos', 'Gabriele Nascimento'], description }
  };
}