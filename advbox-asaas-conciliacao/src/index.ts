import { buildBemolPaymentAttribution, BEMOL_PJ_CNPJ } from './domain/bemol-service.js';
import { validateBankTransaction } from './domain/bank-transaction.js';

const paymentsDates = Array.from({ length: 10 }, (_, i) => {
  const day = String(i + 1).padStart(2, '0');
  return `2024-09-${day}`;
});

console.log('🔄 Executando conciliação de pagamentos Bemol');
console.log(`📅 Período: 01 a 10 de setembro de 2024\n`);

let successCount = 0;
let rejectionCount = 0;

paymentsDates.forEach((date) => {
  try {
    const result = buildBemolPaymentAttribution(BEMOL_PJ_CNPJ, {
      payerName: `Pagador ${date}`,
      contractorName: 'Calandrini Contadores',
      closingDate: date,
      totalAmount: 1000 + Math.random() * 5000,
      bemolAmount: Math.random() * 1000,
    });

    validateBankTransaction({
      provider: 'asaas',
      providerTransactionId: `txn_${date}`,
      bankAccountId: '0001234567',
      occurredAt: date,
      amountInCents: Math.round(result.financialLaunch.amount * 100),
      direction: 'CREDIT',
    });

    console.log(`✅ ${date} - Pagamento de R$ ${result.financialLaunch.amount.toFixed(2)} atribuído a ${result.financialLaunch.customerName}`);
    successCount++;
  } catch (error) {
    console.log(`❌ ${date} - Erro ao processar: ${error instanceof Error ? error.message : String(error)}`);
    rejectionCount++;
  }
});

console.log(`\n📊 Resumo:`);
console.log(`  Processados com sucesso: ${successCount}`);
console.log(`  Erros: ${rejectionCount}`);
console.log(`  Total: ${successCount + rejectionCount}`);
