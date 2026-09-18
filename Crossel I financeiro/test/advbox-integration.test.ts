import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('AdvBox Integration', () => {
  it('módulos AdvBox podem ser importados', async () => {
    const { AdvBoxClient } = await import('../src/integrations/advbox-client.js');
    const { AdvBoxLawsuitsService } = await import('../src/integrations/advbox-lawsuits.js');
    const { AdvBoxPostsService } = await import('../src/integrations/advbox-posts.js');
    const { AdvBoxCustomersService } = await import('../src/integrations/advbox-customers.js');
    const { AdvBoxReviewService } = await import('../src/domain/advbox-review-service.js');

    assert.ok(AdvBoxClient);
    assert.ok(AdvBoxLawsuitsService);
    assert.ok(AdvBoxPostsService);
    assert.ok(AdvBoxCustomersService);
    assert.ok(AdvBoxReviewService);
  });

  it('AdvBoxClient constrói com configuração', async () => {
    const { AdvBoxClient } = await import('../src/integrations/advbox-client.js');

    const client = new AdvBoxClient({
      apiUrl: 'https://api.advbox.test',
      apiToken: 'test-token'
    });

    assert.ok(client);
  });

  it('AdvBoxLawsuitsService pode ser instanciado', async () => {
    const { AdvBoxClient } = await import('../src/integrations/advbox-client.js');
    const { AdvBoxLawsuitsService } = await import('../src/integrations/advbox-lawsuits.js');

    const client = new AdvBoxClient({
      apiUrl: 'https://api.advbox.test',
      apiToken: 'test-token'
    });

    const service = new AdvBoxLawsuitsService(client);
    assert.ok(service);
  });

  it('AdvBoxReviewService pode ser instanciado', async () => {
    const { AdvBoxClient } = await import('../src/integrations/advbox-client.js');
    const { AdvBoxReviewService } = await import('../src/domain/advbox-review-service.js');

    const client = new AdvBoxClient({
      apiUrl: 'https://api.advbox.test',
      apiToken: 'test-token'
    });

    const service = new AdvBoxReviewService(client);
    assert.ok(service);
  });
});
