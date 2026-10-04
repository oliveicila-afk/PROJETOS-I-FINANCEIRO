import { buildBemolPaymentAttribution, type BemolPaymentAttribution, type BemolPaymentInput } from '../domain/bemol-service.js';

export type AdvboxGateway = {
  createFinancialLaunch(input: BemolPaymentAttribution['financialLaunch']): Promise<unknown>;
  createTask(input: BemolPaymentAttribution['financialTask']): Promise<unknown>;
};

export async function processBemolPayment(
  advbox: AdvboxGateway,
  input: { sourceCnpj: string; payment: BemolPaymentInput }
): Promise<BemolPaymentAttribution> {
  const attribution = buildBemolPaymentAttribution(input.sourceCnpj, input.payment);
  await advbox.createFinancialLaunch(attribution.financialLaunch);
  await advbox.createTask(attribution.financialTask);
  return attribution;
}