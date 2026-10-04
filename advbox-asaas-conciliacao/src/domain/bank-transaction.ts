export type BankTransaction = {
  provider: string;
  providerTransactionId: string;
  bankAccountId: string;
  occurredAt: string;
  amountInCents: number;
  direction: 'CREDIT' | 'DEBIT';
  description?: string;
  document?: string;
};

export function validateBankTransaction(transaction: BankTransaction): void {
  if (!transaction.providerTransactionId.trim()) throw new Error('Transacao exige identificador do provedor.');
  if (!transaction.bankAccountId.trim()) throw new Error('Transacao exige conta bancaria.');
  if (!/^\d{4}-\d{2}-\d{2}/.test(transaction.occurredAt)) throw new Error('Transacao exige data ISO.');
  if (!Number.isSafeInteger(transaction.amountInCents) || transaction.amountInCents <= 0) throw new Error('Valor deve ser inteiro positivo em centavos.');
}