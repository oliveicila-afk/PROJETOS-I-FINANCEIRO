import type { AsaasClient, AsaasCustomer, AsaasPayment } from '../integrations/asaas.js';

export type CustomerIdentifier = { cpfCnpj?: string; name?: string };
export type FinancialSummary = {
  customer: AsaasCustomer;
  openPayments: AsaasPayment[];
  overduePayments: AsaasPayment[];
};

export class CustomerNotFoundError extends Error {}
export class MultipleCustomersFoundError extends Error {}

export async function getFinancialSummary(
  asaas: Pick<AsaasClient, 'listCustomers' | 'listPayments'>,
  identifier: CustomerIdentifier,
  today = new Date()
): Promise<FinancialSummary> {
  if (!identifier.cpfCnpj && !identifier.name) throw new Error('Informe CPF/CNPJ ou nome para localizar o cliente.');
  const customers = await asaas.listCustomers(identifier.cpfCnpj
    ? { cpfCnpj: identifier.cpfCnpj, limit: 10 }
    : { name: identifier.name, limit: 10 });
  if (customers.data.length === 0) throw new CustomerNotFoundError('Cliente não encontrado.');
  if (customers.data.length > 1) throw new MultipleCustomersFoundError('Mais de um cliente encontrado.');

  const customer = customers.data[0];
  const payments = await asaas.listPayments({ customer: customer.id, billingType: 'BOLETO', limit: 100 });
  const todayIso = today.toISOString().slice(0, 10);
  const openPayments = payments.data.filter((payment) => ['PENDING', 'OVERDUE'].includes(payment.status));
  const overduePayments = openPayments.filter((payment) => payment.status === 'OVERDUE' || payment.dueDate < todayIso);
  return { customer, openPayments, overduePayments };
}
