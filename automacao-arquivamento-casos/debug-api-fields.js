import https from 'https';

// Configuration
const ADVBOX_API_URL = 'https://app.advbox.com.br/api/v1';
const ADVBOX_TOKEN = process.env.ADVBOX_TOKEN;

if (!ADVBOX_TOKEN) {
  console.error('Error: ADVBOX_TOKEN environment variable is not set');
  process.exit(1);
}

// Helper function to make HTTPS requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(ADVBOX_API_URL + path);
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${ADVBOX_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Debug function to inspect API response structure
async function debugApiFields() {
  console.log('🔍 Debugging AdvBox API fields...\n');
  console.log('⏱️  Timestamp:', new Date().toISOString());
  console.log('📍 API URL:', ADVBOX_API_URL);
  console.log('');

  try {
    // Fetch a single page of lawsuits
    console.log('📋 Step 1: Fetching first lawsuit (limit=1)...');
    const response = await makeRequest('GET', '/lawsuits?limit=1&offset=0');

    if (response.status !== 200) {
      console.error(`❌ Error: Status ${response.status}`);
      console.error(JSON.stringify(response.data, null, 2));
      process.exit(1);
    }

    console.log(`✅ Status: ${response.status}\n`);

    // Log full response structure
    console.log('📦 Full Response Structure:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');

    // Extract first lawsuit if exists
    const lawsuits = response.data?.data || response.data?.lawsuits || [];
    if (lawsuits.length > 0) {
      const firstLawsuit = lawsuits[0];

      console.log('🎯 First Lawsuit Keys and Values:');
      console.log('─'.repeat(80));
      Object.entries(firstLawsuit).forEach(([key, value]) => {
        const valueStr = typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : String(value).substring(0, 50);
        console.log(`  ${key.padEnd(30)} : ${valueStr}`);
      });
      console.log('─'.repeat(80));
      console.log('');

      // Check for percentage-related fields
      console.log('🔎 Searching for percentage-related fields:');
      const percentageFields = Object.keys(firstLawsuit).filter(key =>
        key.toLowerCase().includes('percent') ||
        key.toLowerCase().includes('honorario') ||
        key.toLowerCase().includes('fee') ||
        key.toLowerCase().includes('pct') ||
        key.toLowerCase().includes('%')
      );

      if (percentageFields.length > 0) {
        console.log('✅ Found percentage-related fields:');
        percentageFields.forEach(field => {
          console.log(`  • ${field}: ${firstLawsuit[field]}`);
        });
      } else {
        console.log('❌ No obvious percentage-related fields found in this lawsuit');
      }
      console.log('');

      // Also check for financial-related fields
      console.log('💰 Financial-related fields:');
      const financialFields = Object.keys(firstLawsuit).filter(key =>
        key.toLowerCase().includes('fees') ||
        key.toLowerCase().includes('valor') ||
        key.toLowerCase().includes('price') ||
        key.toLowerCase().includes('amount') ||
        key.toLowerCase().includes('money')
      );

      if (financialFields.length > 0) {
        financialFields.forEach(field => {
          console.log(`  • ${field}: ${firstLawsuit[field]}`);
        });
      } else {
        console.log('  (no obvious financial fields found)');
      }
      console.log('');

      // Save full first lawsuit to file for inspection
      const fs = await import('fs');
      fs.writeFileSync('/tmp/api_debug_first_lawsuit.json', JSON.stringify(firstLawsuit, null, 2));
      console.log('📝 Full first lawsuit saved to: /tmp/api_debug_first_lawsuit.json');

    } else {
      console.log('⚠️  No lawsuits returned in response');
    }

    console.log('\n✅ Debug complete!');

  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    process.exit(1);
  }
}

// Run the debug
debugApiFields().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
