import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDailyReportEmail, classifyTriageCase, getReviewWindow, summarizeTriageResults } from '../src/domain/triage-service.js';

describe('Crossell triagem', () => {
  it('classifica acao bancaria, anexa documentos e sinaliza entrada', () => {
    const result = classifyTriageCase({
      id: 'case_1',
      customerName: 'Cliente Teste',
      processNumber: '0001234-56.2026.8.11.0001',
      comment: 'POSSÍVEL AÇÃO BANCÁRIA IDENTIFICADA NO CONTRACHEQUE DO(A) CLIENTE. Há pagamento inicial.',
      paycheckUrl: 'https://example.test/contracheque.pdf',
      bankStatementUrl: 'https://example.test/extrato.pdf'
    }, 'Fabio');

    assert.equal(result.category, 'bank_action');
    assert.equal(result.assignee, 'Fabio');
    assert.equal(result.urgent, true);
    assert.equal(result.important, true);
    assert.equal(result.attachments.length, 2);
    assert.equal(result.standardTaskNote, 'POSSÍVEL AÇÃO BANCÁRIA IDENTIFICADA NO CONTRACHEQUE DO(A) CLIENTE');
  });

  it('nao encaminha notas que informam nenhuma oportunidade', () => {
    const results = [
      classifyTriageCase({ id: 'case_2', customerName: 'Cliente 2', comment: 'Novas oportunidades: Nenhuma.', externalReview: { documents: [], sacNotes: [] } }),
      classifyTriageCase({ id: 'case_3', customerName: 'Cliente 3', comment: 'Não foi identificada nenhuma nova oportunidade de atendimento.', externalReview: { documents: [], sacNotes: [] } })
    ];

    assert.equal(results[0].category, 'no_opportunity');
    assert.equal(results[1].category, 'no_opportunity');
  });

  it('revisa documentos e SAC antes de encerrar uma nota negativa', () => {
    const withoutReview = classifyTriageCase({ id: 'case_7', customerName: 'Cliente 7', comment: 'Novas oportunidades: Nenhuma.' });
    const withDemandInDocuments = classifyTriageCase({
      id: 'case_8',
      customerName: 'Cliente 8',
      comment: 'Novas oportunidades: Nenhuma.',
      externalReview: { documents: ['extrato bancário com possível ação bancária'], sacNotes: [] }
    }, 'Fabio');

    assert.equal(withoutReview.category, 'ambiguous');
    assert.equal(withDemandInDocuments.category, 'opportunity');
    assert.equal(withDemandInDocuments.assignee, 'Fabio');
    assert.equal(withDemandInDocuments.standardTaskNote, 'Identificada novas oportunidades para fechamento');
  });

  it('encaminha nova oportunidade com nota padrão sem copiar a tarefa', () => {
    const result = classifyTriageCase({ id: 'case_4', customerName: 'Cliente 4', comment: 'Novas oportunidades: Planejamento previdenciário.' }, 'Leticia');

    assert.equal(result.category, 'opportunity');
    assert.equal(result.standardTaskNote, 'Identificada novas oportunidades para fechamento');
  });

  it('gera relatorio com data e detalhes somente dos ambiguos', () => {
    const report = summarizeTriageResults([
      classifyTriageCase({ id: 'case_5', customerName: 'Cliente', comment: 'Oportunidade com valor de entrada' }, 'Leticia'),
      classifyTriageCase({ id: 'case_6', customerName: 'Maria', processNumber: '0009876-54.2026.8.11.0002', comment: 'Texto sem classificação' })
    ]);
    const email = buildDailyReportEmail(report, new Date(2026, 8, 18));

    assert.equal(email.subject, 'CROSSELL - AUTOMAÇÃO');
    assert.match(email.body, /18-09-2026/);
    assert.match(email.body, /Total de casos processados: 2/);
    assert.match(email.body, /Oportunidades encaminhadas ao comercial: 1/);
    assert.match(email.body, /Sem oportunidade: 0/);
    assert.match(email.body, /Ambiguos \(revisao manual\): 1/);
    assert.match(email.body, /Maria \| Processo: 0009876-54\.2026\.8\.11\.0002/);
  });

  it('calcula a janela entre disparos mesmo ao atravessar a meia-noite', () => {
    const lastDispatch = new Date('2026-09-17T15:00:00-04:00');
    const currentDispatch = new Date('2026-09-18T08:00:00-04:00');
    const window = getReviewWindow(lastDispatch, currentDispatch);

    assert.equal(window.start.getTime(), lastDispatch.getTime());
    assert.equal(window.end.getTime(), currentDispatch.getTime());
  });
});