export type TriageCategory = 'opportunity' | 'bank_action' | 'no_opportunity' | 'ambiguous';

export type TriageCase = {
  id: string;
  customerName: string;
  processNumber?: string;
  comment: string;
  externalReview?: DemandEvidence;
  paycheckUrl?: string;
  bankStatementUrl?: string;
};

export type DemandEvidence = {
  documents: string[];
  sacNotes: string[];
};

export type TriageResult = {
  caseId: string;
  customerName: string;
  processNumber?: string;
  category: TriageCategory;
  assignee?: 'Fabio' | 'Leticia';
  urgent: boolean;
  important: boolean;
  attachments: string[];
  standardTaskNote?: string;
};

const bankActionMarker = 'POSSÍVEL AÇÃO BANCÁRIA IDENTIFICADA NO CONTRACHEQUE DO(A) CLIENTE';
const entryPaymentTerms = ['entrada', 'valor inicial', 'pagamento inicial'];

function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function hasEntryPaymentSignal(comment: string): boolean {
  const normalizedComment = normalizeText(comment);
  return entryPaymentTerms.some((term) => normalizedComment.includes(term));
}

function hasDemandEvidence(evidence: DemandEvidence): boolean {
  const sourceText = normalizeText([...evidence.documents, ...evidence.sacNotes].join(' '));
  if (!sourceText) return false;
  if (/sem demanda|nenhuma demanda|sem oportunidade|nenhuma oportunidade|nao tem interesse/.test(sourceText)) return false;
  return /demanda|oportunidade|acao bancaria|acao|extrato|contracheque|planejamento|servico|interesse/.test(sourceText);
}

export function classifyTriageCase(triageCase: TriageCase, assignee?: 'Fabio' | 'Leticia'): TriageResult {
  const comment = triageCase.comment;
  const normalizedComment = normalizeText(comment);
  const isBankAction = normalizedComment.includes(normalizeText(bankActionMarker));
  const isNoOpportunity = /sem oportunidade|nao tem interesse|novas oportunidades?\s*:\s*nenhum|nenhuma nova oportunidade|nenhuma oportunidade/.test(normalizedComment);
  const externalReviewFoundDemand = isNoOpportunity && triageCase.externalReview !== undefined && hasDemandEvidence(triageCase.externalReview);
  const externalReviewCompletedWithoutDemand = isNoOpportunity && triageCase.externalReview !== undefined && !externalReviewFoundDemand;
  const isOpportunity = externalReviewFoundDemand || (!isNoOpportunity && /novas oportunidades?\s*:\s*(?!nenhum)|oportunidade|interesse|contratar|servico/.test(normalizedComment));
  const category: TriageCategory = isBankAction
    ? 'bank_action'
    : isOpportunity
      ? 'opportunity'
      : isNoOpportunity && externalReviewCompletedWithoutDemand
        ? 'no_opportunity'
        : 'ambiguous';
  const requiresCommercialFollowUp = category === 'opportunity' || category === 'bank_action';
  const entryPayment = requiresCommercialFollowUp && hasEntryPaymentSignal(comment);
  const standardTaskNote = category === 'bank_action'
    ? bankActionMarker
    : category === 'opportunity'
      ? 'Identificada novas oportunidades para fechamento'
      : undefined;

  return {
    caseId: triageCase.id,
    customerName: triageCase.customerName,
    processNumber: triageCase.processNumber,
    category,
    assignee: requiresCommercialFollowUp ? assignee : undefined,
    urgent: entryPayment,
    important: entryPayment,
    attachments: [triageCase.paycheckUrl, triageCase.bankStatementUrl].filter((url): url is string => Boolean(url)),
    standardTaskNote
  };
}

export type DailyTriageReport = {
  processed: number;
  opportunities: number;
  noOpportunities: number;
  ambiguousCases: Array<{ customerName: string; processNumber?: string }>;
};

export function summarizeTriageResults(results: TriageResult[]): DailyTriageReport {
  return results.reduce<DailyTriageReport>((report, result) => {
    report.processed += 1;
    if (result.category === 'opportunity' || result.category === 'bank_action') report.opportunities += 1;
    if (result.category === 'no_opportunity') report.noOpportunities += 1;
    if (result.category === 'ambiguous') report.ambiguousCases.push({ customerName: result.customerName, processNumber: result.processNumber });
    return report;
  }, { processed: 0, opportunities: 0, noOpportunities: 0, ambiguousCases: [] });
}

export function buildDailyReportEmail(report: DailyTriageReport, date = new Date()): { subject: string; body: string } {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const ambiguousLines = report.ambiguousCases.length === 0
    ? 'Nenhum caso.'
    : report.ambiguousCases.map((item) => `- ${item.customerName}${item.processNumber ? ` | Processo: ${item.processNumber}` : ''}`).join('\n');

  return {
    subject: 'CROSSELL - AUTOMAÇÃO',
    body: [
      `Resumo da triagem automatica do AdvBox em ${day}-${month}-${year}:`,
      '',
      `- Total de casos processados: ${report.processed}`,
      `- Oportunidades encaminhadas ao comercial: ${report.opportunities}`,
      `- Sem oportunidade: ${report.noOpportunities}`,
      `- Ambiguos (revisao manual): ${report.ambiguousCases.length}`,
      ambiguousLines
    ].join('\n')
  };
}

export type ReviewWindow = { start: Date; end: Date };

export function getReviewWindow(lastDispatch: Date, currentDispatch: Date): ReviewWindow {
  if (currentDispatch <= lastDispatch) throw new Error('O disparo atual deve ser posterior ao ultimo disparo.');
  return { start: new Date(lastDispatch), end: new Date(currentDispatch) };
}