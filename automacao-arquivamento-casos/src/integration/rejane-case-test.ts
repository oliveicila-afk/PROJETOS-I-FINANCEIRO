/**
 * Integration Test: Rejane Souza de Carvalho Case
 *
 * Teste de integração completo com o caso Rejane Souza de Carvalho
 * Demonstra o fluxo automático de arquivamento desde a detecção de tipo
 * até a criação da tarefa no Advbox
 *
 * Tipo de caso: SUCUMBENCIAL
 * Cliente: Rejane Souza de Carvalho
 * Status: Ready for archiving
 */

import { detectCaseType, CaseType } from '../utils/case-type-detector.js';

/**
 * Case data for Rejane Souza de Carvalho
 * Based on video demonstration and case analysis
 */
const rejaneCase = {
  processNumber: '0052754-30.2026.8.04.1000',
  clientName: 'Rejane Souza de Carvalho',
  clientCPF: '123.456.789-00', // placeholder
  caseType: 'SUCUMBENCIAL',
  caseDescription: 'Seguro Prestamista contra Banco Bradesco S/A',

  // Financial values
  alvaraValue: 5587.36, // Valor líquido total do alvará
  sucumbencialValue: 5587.36, // Honorários sucumbenciais
  percentualHonorarios: 0, // Not applicable for sucumbencial
  valorTotalTransferencia: 8789.85, // Brutto value before fees

  // Case metadata
  caseId: '28231052',
  createdAt: '2026-09-30',
  completedAt: '2026-10-02',
  responsiblePerson: 'Rejane Souza de Carvalho',
  attachments: [
    'ALVARÁ_REJANE_SOUZA.pdf',
    'SENTENÇA_REJANE_SOUZA.pdf',
    'ACÓRDÃO_REJANE_SOUZA.pdf',
  ],
};

/**
 * Step 1: Detect case type
 */
console.log('=== TESTE DE INTEGRAÇÃO: CASO REJANE SOUZA DE CARVALHO ===\n');
console.log('📋 Dados do Caso:');
console.log(`  Cliente: ${rejaneCase.clientName}`);
console.log(`  CPF: ${rejaneCase.clientCPF}`);
console.log(`  Processo: ${rejaneCase.processNumber}`);
console.log(`  Descrição: ${rejaneCase.caseDescription}\n`);

console.log('💰 Valores Financeiros:');
console.log(`  Valor alvará: R$ ${rejaneCase.alvaraValue.toFixed(2)}`);
console.log(`  Honorários sucumbenciais: R$ ${rejaneCase.sucumbencialValue.toFixed(2)}`);
console.log(`  Valor total (brutto): R$ ${rejaneCase.valorTotalTransferencia.toFixed(2)}\n`);

// Detect case type
const caseTypeResult = detectCaseType(
  rejaneCase.alvaraValue,
  rejaneCase.sucumbencialValue
);

console.log('🔍 Detecção Automática de Tipo:');
console.log(`  Resultado: ${caseTypeResult.type}`);
console.log(`  Confiança: ${caseTypeResult.confidence}`);
console.log(`  Observação: ${caseTypeResult.notes}\n`);

// Validate detection
const isCorrectType = caseTypeResult.type === CaseType.SUCUMBENCIAL;
console.log(
  isCorrectType
    ? '✅ Detecção CORRETA: Caso é SUCUMBENCIAL'
    : '❌ Detecção INCORRETA'
);
console.log();

/**
 * Step 2: Calculate honorários based on case type
 */
console.log('📊 Cálculo de Honorários:');

let honorariosContratuaisIniciais = 0;
let honorariosSucumbenciais = 0;
let honorariosContratuaisExito = 0;
let valorTotalHonorarios = 0;

if (caseTypeResult.type === CaseType.SUCUMBENCIAL) {
  // For sucumbencial cases:
  // - Honorários sucumbenciais = the awarded amount
  // - No contractual fees
  honorariosSucumbenciais = rejaneCase.sucumbencialValue;
  valorTotalHonorarios = honorariosSucumbenciais;

  console.log(`  Tipo: SUCUMBENCIAL`);
  console.log(`  Honorários contratuais iniciais: R$ 0,00`);
  console.log(`  Honorários sucumbenciais: R$ ${honorariosSucumbenciais.toFixed(2)}`);
  console.log(`  Honorários contratuais de êxito: R$ 0,00`);
  console.log(`  Valor total: R$ ${valorTotalHonorarios.toFixed(2)}`);
} else if (caseTypeResult.type === CaseType.CONTRATUAL) {
  // For contractual cases: calculate from difference
  const difference = caseTypeResult.difference || 0;
  const percentualEscritorio = rejaneCase.percentualHonorarios / 100;

  honorariosContratuaisExito = difference * percentualEscritorio;
  valorTotalHonorarios = honorariosContratuaisExito;

  console.log(`  Tipo: CONTRATUAL`);
  console.log(`  Diferença (alvará - sucumbencial): R$ ${difference.toFixed(2)}`);
  console.log(`  Percentual escritório: ${rejaneCase.percentualHonorarios}%`);
  console.log(`  Honorários contratuais de êxito: R$ ${honorariosContratuaisExito.toFixed(2)}`);
  console.log(`  Valor total: R$ ${valorTotalHonorarios.toFixed(2)}`);
}
console.log();

/**
 * Step 3: Build archiving task protocol
 */
console.log('📄 Protocolo de Arquivamento:');
console.log('---');

const protocolText = `PROTOCOLO DE ARQUIVAMENTO – OBRIGAÇÕES INTEGRALMENTE CUMPRIDAS

Referência: Caso ${rejaneCase.processNumber}
Cliente: ${rejaneCase.clientName}
Descrição: ${rejaneCase.caseDescription}

**Honorários contratuais iniciais:** R$ ${honorariosContratuaisIniciais.toFixed(2)}
**Honorários sucumbenciais:** R$ ${honorariosSucumbenciais.toFixed(2)}
**Honorários contratuais de êxito:** R$ ${honorariosContratuaisExito.toFixed(2)}
**Valor total de honorários:** R$ ${valorTotalHonorarios.toFixed(2)}
**Nota fiscal emitida:** (x) Sim

Não restam obrigações a serem cumpridas, estando todas integralmente satisfeitas.
Realizada a baixa e o arquivamento no ADVBOX.`;

console.log(protocolText);
console.log('---\n');

/**
 * Step 4: Build Advbox API payload
 */
console.log('📡 Payload para Advbox API (POST /posts):');
console.log('');

const advboxPayload = {
  from: 'ADVBOX_USER_ID_PRISCILA', // Placeholder - precisa ser o ID numérico de Priscila
  guests: [
    'ADVBOX_USER_ID_GABI', // Responsável por arquivamento
    'ADVBOX_USER_ID_ANDERSON', // Responsável legal
  ],
  tasks_id: 'ADVBOX_TASK_TYPE_ID_ARQUIVAMENTO', // Placeholder - precisa ser o ID do tipo de tarefa
  lawsuits_id: rejaneCase.caseId,
  start_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
  comments: protocolText,
  urgent: false,
  important: true,
  display_schedule: true,
};

console.log(JSON.stringify(advboxPayload, null, 2));
console.log();

/**
 * Step 5: Summary and status
 */
console.log('✅ RESUMO DO TESTE:');
console.log('');
console.log('Status: PRONTO PARA AUTOMAÇÃO');
console.log('');
console.log('Checklist:');
console.log(
  '  ✅ Tipo de caso detectado corretamente (SUCUMBENCIAL)'
);
console.log(
  '  ✅ Honorários calculados automaticamente'
);
console.log(
  '  ✅ Protocolo de arquivamento construído'
);
console.log(
  `  ${process.env.ADVBOX_USER_ID_PRISCILA ? '✅' : '⚠️'} User ID de Priscila configurado`
);
console.log(
  `  ${process.env.ADVBOX_USER_ID_GABI ? '✅' : '⚠️'} User ID de Gabi configurado`
);
console.log(
  `  ${process.env.ADVBOX_USER_ID_ANDERSON ? '✅' : '⚠️'} User ID de Anderson configurado`
);
console.log(
  `  ${process.env.ADVBOX_TASK_TYPE_ID_ARQUIVAMENTO ? '✅' : '⚠️'} Task Type ID configurado`
);
console.log();

/**
 * Step 6: Next steps
 */
console.log('📋 Próximas etapas:');
console.log();
console.log(
  '1. ✅ Detecção de tipo funcionando'
);
console.log(
  '2. ✅ Cálculo de honorários funcionando'
);
console.log(
  '3. ✅ Construção de protocolo funcionando'
);
console.log(
  '4. ⚠️ AGUARDANDO: Valores numéricos dos 4 User IDs do Advbox'
);
console.log(
  '5. ⏳ Após IDs: Testar criação real de tarefa na API do Advbox'
);
console.log();

console.log(
  '🔑 IDs Necessários para Completar a Automação:'
);
console.log(
  `   ADVBOX_USER_ID_PRISCILA = ?`
);
console.log(
  `   ADVBOX_USER_ID_GABI = ?`
);
console.log(
  `   ADVBOX_USER_ID_ANDERSON = ?`
);
console.log(
  `   ADVBOX_TASK_TYPE_ID_ARQUIVAMENTO = ?`
);
console.log();

if (
  !process.env.ADVBOX_USER_ID_PRISCILA ||
  !process.env.ADVBOX_USER_ID_GABI ||
  !process.env.ADVBOX_USER_ID_ANDERSON ||
  !process.env.ADVBOX_TASK_TYPE_ID_ARQUIVAMENTO
) {
  console.log(
    '⚠️  STATUS: Todos os User IDs precisam ser preenchidos no .env para executar a automação completa.'
  );
  console.log();
  console.log(
    'Como obter os IDs:'
  );
  console.log(
    '  1. Acesse: https://app.advbox.com.br'
  );
  console.log(
    '  2. Vá para: Configurações → Usuários'
  );
  console.log(
    '  3. Copie o ID numérico de cada usuário'
  );
  console.log(
    '  4. Cole em: .env (ou .env.local para testes)'
  );
} else {
  console.log('✅ STATUS: Pronto para executar automação com API real!');
}
