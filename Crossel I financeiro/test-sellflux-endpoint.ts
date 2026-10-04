import { getSellFluxSACConfig } from './src/config.js';

async function testSellFluxEndpoint() {
  try {
    const config = getSellFluxSACConfig();

    console.log('🔍 Testando endpoint do SellFlux SAC...\n');
    console.log(`📍 URL: https://api-lp-sac.sellflux.app/chat/note`);
    console.log('🔑 Token configurado: sim (valor oculto)');
    console.log(`\n⏳ Fazendo requisição...\n`);

    // Test com um lead_id genérico (você pode mudar depois)
    const testLeadId = '178935650'; // Um ID real do SellFlux para testar
    const url = `https://api-lb-sac.sellflux.app/chat/kanban/card/lead/responsibles?lead_id=${testLeadId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Status da resposta: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`❌ Erro! Status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Resposta: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log('✅ Endpoint funciona!\n');
    console.log('📦 Dados recebidos:');
    console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');

    console.log('\n✅ O endpoint está correto e respondendo!');

  } catch (error) {
    console.error('❌ Erro ao testar endpoint:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testSellFluxEndpoint();
