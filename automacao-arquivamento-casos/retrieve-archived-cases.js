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
    // Step 1: Search for archived cases
    console.log('📋 Step 1: Fetching archived cases...');
    let allCases = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await makeRequest('GET', `/cases?status=archived&limit=${limit}&offset=${offset}`);

      if (response.status !== 200) {
        console.error(`Error fetching cases: Status ${response.status}`);
        console.error(response.data);
        break;
      }

      const cases = response.data?.cases || response.data || [];
      if (Array.isArray(cases) && cases.length > 0) {
        allCases = allCases.concat(cases);
        console.log(`  ✓ Fetched ${cases.length} cases (offset: ${offset})`);
        offset += limit;
        hasMore = cases.length === limit;
      } else {
        hasMore = false;
      }
    }

    console.log(`\n✓ Total archived cases found: ${allCases.length}\n`);

    if (allCases.length === 0) {
      console.log('No archived cases found.');
      return;
    }

    // Step 2: Retrieve details for each case
    console.log('📑 Step 2: Retrieving detailed information for each case...\n');
    const archivedCasesDetails = [];

    for (let i = 0; i < allCases.length; i++) {
      const caseItem = allCases[i];
      const caseId = caseItem.id || caseItem.case_id;

      console.log(`Processing case ${i + 1}/${allCases.length}: ${caseId}`);

      try {
        // Get case details
        const detailsResponse = await makeRequest('GET', `/cases/${caseId}`);
        const caseDetails = detailsResponse.data;

        // Get case tasks
        const tasksResponse = await makeRequest('GET', `/cases/${caseId}/tasks`);
        const caseTasks = tasksResponse.data?.tasks || [];

        archivedCasesDetails.push({
          id: caseId,
          case_number: caseDetails?.case_number || caseDetails?.numero || 'N/A',
          client_name: caseDetails?.client_name || caseDetails?.cliente || 'N/A',
          case_description: caseDetails?.description || caseDetails?.descricao || 'N/A',
          status: caseDetails?.status || 'archived',
          archived_date: caseDetails?.archived_at || caseDetails?.data_arquivamento || 'N/A',
          archiving_stage: caseDetails?.archiving_stage || caseDetails?.etapa_arquivamento || 'N/A',
          total_honoraries: caseDetails?.total_honoraries || caseDetails?.valor_honorarios || 0,
          latest_task: caseTasks.length > 0 ? caseTasks[caseTasks.length - 1] : null,
          all_tasks: caseTasks,
          raw_details: caseDetails
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`  ✗ Error retrieving details for case ${caseId}:`, err.message);
      }
    }

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
  // Pattern 1: Archiving stages distribution
  const stageDistribution = {};
  cases.forEach(c => {
    const stage = c.archiving_stage || 'unknown';
    stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
  });

  console.log('📌 Pattern 1 - Archiving Stages Distribution:');
  Object.entries(stageDistribution).forEach(([stage, count]) => {
    const percentage = ((count / cases.length) * 100).toFixed(1);
    console.log(`  • ${stage}: ${count} cases (${percentage}%)`);
  });

  // Pattern 2: Honoraries analysis
  const honorariesValues = cases
    .map(c => parseFloat(c.total_honoraries) || 0)
    .filter(v => v > 0)
    .sort((a, b) => b - a);

  if (honorariesValues.length > 0) {
    const sum = honorariesValues.reduce((a, b) => a + b, 0);
    const avg = sum / honorariesValues.length;
    const max = honorariesValues[0];
    const min = honorariesValues[honorariesValues.length - 1];

    console.log('\n📌 Pattern 2 - Honoraries Analysis:');
    console.log(`  • Total amount: R$ ${sum.toFixed(2)}`);
    console.log(`  • Average per case: R$ ${avg.toFixed(2)}`);
    console.log(`  • Maximum: R$ ${max.toFixed(2)}`);
    console.log(`  • Minimum: R$ ${min.toFixed(2)}`);
    console.log(`  • Cases with honoraries: ${honorariesValues.length}/${cases.length}`);
  }

  // Pattern 3: Most common client names
  const clientDistribution = {};
  cases.forEach(c => {
    const client = c.client_name || 'Unknown';
    clientDistribution[client] = (clientDistribution[client] || 0) + 1;
  });

  const topClients = Object.entries(clientDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('\n📌 Pattern 3 - Top 10 Clients by Case Count:');
  topClients.forEach(([client, count], idx) => {
    console.log(`  ${idx + 1}. ${client}: ${count} cases`);
  });

  // Pattern 4: Task analysis from latest tasks
  const taskAssignees = {};
  cases.forEach(c => {
    if (c.latest_task && c.latest_task.assigned_to) {
      const assignee = c.latest_task.assigned_to;
      taskAssignees[assignee] = (taskAssignees[assignee] || 0) + 1;
    }
  });

  if (Object.keys(taskAssignees).length > 0) {
    console.log('\n📌 Pattern 4 - Final Task Assignees (Usually Financial Summary):');
    Object.entries(taskAssignees)
      .sort((a, b) => b[1] - a[1])
      .forEach(([assignee, count]) => {
        console.log(`  • ${assignee}: ${count} cases`);
      });
  }

  console.log('\n✓ Pattern analysis complete!');
}

// Run the script
retrieveArchivedCases().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
