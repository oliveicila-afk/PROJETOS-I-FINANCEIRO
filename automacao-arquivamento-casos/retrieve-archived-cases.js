import https from 'https';
import fs from 'fs';

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

// Main function to retrieve archived cases
async function retrieveArchivedCases() {
  console.log('🔍 Retrieving archived cases from AdvBox API...\n');

  try {
    // Step 1: Search for archived cases with date filter (up to Oct 6, 2026)
    console.log('📋 Step 1: Fetching archived cases...');
    let allCases = [];
    let offset = 0;
    const limit = 100; // Increased to reduce number of requests
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await makeRequest('GET', `/lawsuits?limit=${limit}&offset=${offset}&exit_execution_end=2026-10-06`);

        if (response.status === 429) {
          // Rate limited - wait and retry
          console.log('  ⏳ Rate limited (429). Waiting 30 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          continue;
        }

        if (response.status !== 200) {
          console.error(`Error fetching cases: Status ${response.status}`);
          console.error(response.data);
          break;
        }

        const cases = response.data?.data || response.data?.cases || response.data?.lawsuits || [];
        if (Array.isArray(cases) && cases.length > 0) {
          allCases = allCases.concat(cases);
          console.log(`  ✓ Fetched ${cases.length} cases (offset: ${offset}, total so far: ${allCases.length})`);
          offset += limit;
          hasMore = cases.length === limit;

          // Add small delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          hasMore = false;
        }
      } catch (err) {
        console.error(`Error in pagination loop: ${err.message}`);
        break;
      }
    }

    console.log(`\n✓ Total archived cases found: ${allCases.length}\n`);

    if (allCases.length === 0) {
      console.log('No archived cases found.');
      return;
    }

    // Step 2: Process cases directly from listing (avoiding individual requests)
    console.log('📑 Step 2: Processing archived cases data...\n');
    const archivedCasesDetails = [];

    for (let i = 0; i < allCases.length; i++) {
      const caseItem = allCases[i];

      archivedCasesDetails.push({
        id: caseItem.id,
        case_number: caseItem.process_number || 'N/A',
        protocol_number: caseItem.protocol_number || 'N/A',
        client_name: caseItem.responsible || 'N/A',
        case_description: caseItem.description || 'N/A',
        status: caseItem.status || 'archived',
        created_at: caseItem.created_at || 'N/A',
        exit_execution_date: caseItem.exit_execution_date || 'N/A',
        fees_expec: caseItem.fees_expec || 0,
        fees_money: caseItem.fees_money || 0,
        raw_details: caseItem
      });

      if ((i + 1) % 500 === 0) {
        console.log(`  ✓ Processed ${i + 1}/${allCases.length} cases`);
      }
    }
    console.log(`  ✓ Processed all ${allCases.length} cases`);

    // Step 3: Analyze patterns
    console.log('\n📊 Step 3: Analyzing patterns...\n');
    analyzePatterns(archivedCasesDetails);

    // Step 4: Output results
    console.log('\n💾 Step 4: Saving detailed results...\n');
    fs.writeFileSync('/tmp/archived_cases_detailed.json', JSON.stringify(archivedCasesDetails, null, 2));
    console.log('✓ Detailed case data saved to: /tmp/archived_cases_detailed.json');

    return archivedCasesDetails;

  } catch (error) {
    console.error('Error during retrieval:', error.message);
    process.exit(1);
  }
}

function analyzePatterns(cases) {
  // Pattern 1: Exit execution date distribution
  const dateDistribution = {};
  cases.forEach(c => {
    const date = c.exit_execution_date ? c.exit_execution_date.split('T')[0] : 'unknown';
    dateDistribution[date] = (dateDistribution[date] || 0) + 1;
  });

  const sortedDates = Object.entries(dateDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('📌 Pattern 1 - Top 10 Exit Execution Dates:');
  sortedDates.forEach(([date, count]) => {
    const percentage = ((count / cases.length) * 100).toFixed(1);
    console.log(`  • ${date}: ${count} cases (${percentage}%)`);
  });

  // Pattern 2: Fees analysis (fees_money)
  const feesValues = cases
    .map(c => parseFloat(c.fees_money) || 0)
    .filter(v => v > 0)
    .sort((a, b) => b - a);

  if (feesValues.length > 0) {
    const sum = feesValues.reduce((a, b) => a + b, 0);
    const avg = sum / cases.length; // Average across all cases
    const max = feesValues[0];
    const min = feesValues[feesValues.length - 1];

    console.log('\n📌 Pattern 2 - Fees Analysis:');
    console.log(`  • Total amount: R$ ${sum.toFixed(2)}`);
    console.log(`  • Average per case (all): R$ ${avg.toFixed(2)}`);
    console.log(`  • Average per case (with fees): R$ ${(sum / feesValues.length).toFixed(2)}`);
    console.log(`  • Maximum: R$ ${max.toFixed(2)}`);
    console.log(`  • Minimum: R$ ${min.toFixed(2)}`);
    console.log(`  • Cases with fees: ${feesValues.length}/${cases.length} (${((feesValues.length / cases.length) * 100).toFixed(1)}%)`);
  }

  // Pattern 3: Most common responsible parties
  const responsibleDistribution = {};
  cases.forEach(c => {
    const responsible = c.client_name && c.client_name !== 'N/A' ? c.client_name : 'Unknown';
    responsibleDistribution[responsible] = (responsibleDistribution[responsible] || 0) + 1;
  });

  const topResponsible = Object.entries(responsibleDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('\n📌 Pattern 3 - Top 10 Responsible Parties:');
  topResponsible.forEach(([responsible, count], idx) => {
    const percentage = ((count / cases.length) * 100).toFixed(1);
    console.log(`  ${idx + 1}. ${responsible}: ${count} cases (${percentage}%)`);
  });

  // Pattern 4: Status distribution
  const statusDistribution = {};
  cases.forEach(c => {
    const status = c.status || 'unknown';
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });

  console.log('\n📌 Pattern 4 - Status Distribution:');
  Object.entries(statusDistribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      const percentage = ((count / cases.length) * 100).toFixed(1);
      console.log(`  • ${status}: ${count} cases (${percentage}%)`);
    });

  console.log('\n✓ Pattern analysis complete!');
}

// Run the script
retrieveArchivedCases().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
