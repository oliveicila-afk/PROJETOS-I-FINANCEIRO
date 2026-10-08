#!/usr/bin/env node

/**
 * CLI Interface for Case Archiving Automation
 */

interface CliArgs {
  lawsuitId?: string;
  processNumber?: string;
  clientName?: string;
  caseType?: 'SUCUMBENCIAL' | 'CONTRATUAL' | 'OTHER';
}

/**
 * Parse command-line arguments
 */
function parseArgs(): CliArgs {
  const args: CliArgs = {};

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    const next = process.argv[i + 1];

    switch (arg) {
      case '--lawsuit-id':
      case '-l':
        args.lawsuitId = next;
        i++;
        break;
      case '--process-number':
      case '-p':
        args.processNumber = next;
        i++;
        break;
      case '--client-name':
      case '-c':
        args.clientName = next;
        i++;
        break;
      case '--case-type':
      case '-t':
        args.caseType = next as any;
        i++;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return args;
}

/**
 * Validate required arguments
 */
function validateArgs(args: CliArgs): boolean {
  const required = ['lawsuitId', 'processNumber', 'clientName'];
  const missing = required.filter((key) => !args[key as keyof CliArgs]);

  if (missing.length > 0) {
    console.error('Argumentos obrigatorios faltando:');
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error('\nUse --help para ver as opcoes disponiveis');
    return false;
  }

  return true;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Automacao de Arquivamento de Casos

Uso:
  archive-case-cli [opcoes]

Opcoes Obrigatorias:
  -l, --lawsuit-id <id>           ID do caso no sistema
  -p, --process-number <numero>   Numero do processo judicial
  -c, --client-name <nome>        Nome do cliente

Opcoes Opcionais:
  -t, --case-type <tipo>          Tipo de caso (SUCUMBENCIAL|CONTRATUAL|OTHER)
                                  Default: detectar automaticamente
  -h, --help                      Mostrar esta mensagem

Exemplo:
  archive-case-cli \\
    --lawsuit-id 12345 \\
    --process-number 0052754-30.2026.8.04.1000 \\
    --client-name "Joao da Silva" \\
    --case-type SUCUMBENCIAL
  `);
}

/**
 * Main execution
 */
async function main() {
  try {
    // Check for help before loading anything
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      printHelp();
      process.exit(0);
    }

    console.log('Iniciando Automacao de Arquivamento...\n');

    const args = parseArgs();

    if (!validateArgs(args)) {
      process.exit(1);
    }

    // Load config and service after validation
    const { config } = await import('../config.js');
    const { ArchivingAutomationService } = await import(
      '../domain/archiving-automation.js'
    );

    // Validate configuration
    if (!config.advbox.token || !config.asaas.apiKey) {
      console.error(
        'Erro: ADVBOX_TOKEN e ASAAS_API_TOKEN nao estao configurados'
      );
      process.exit(1);
    }

    // Execute archiving automation
    const automationService = new ArchivingAutomationService();

    console.log('Dados do Caso:');
    console.log(`   - Lawsuit ID: ${args.lawsuitId}`);
    console.log(`   - Processo: ${args.processNumber}`);
    console.log(`   - Cliente: ${args.clientName}`);
    if (args.caseType) {
      console.log(`   - Tipo: ${args.caseType}`);
    }
    console.log('');

    const result = await automationService.processArchivingCase({
      lawsuitId: args.lawsuitId!,
      processNumber: args.processNumber!,
      clientName: args.clientName!,
      caseType: args.caseType,
    });

    console.log('\nSucesso!\n');
    console.log('Resultado:');
    console.log(JSON.stringify(result, null, 2));

    // Output JSON to stdout for parsing
    console.log('\n---JSON_OUTPUT---');
    console.log(
      JSON.stringify(
        {
          status: 'success',
          timestamp: new Date().toISOString(),
          result,
        },
        null,
        2
      )
    );
    console.log('---JSON_OUTPUT---');

    process.exit(0);
  } catch (error) {
    console.error(
      '\nErro ao executar arquivamento:',
      error instanceof Error ? error.message : String(error)
    );

    // Output error JSON to stdout
    console.log('\n---JSON_OUTPUT---');
    console.log(
      JSON.stringify(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
    console.log('---JSON_OUTPUT---');

    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, parseArgs, validateArgs };
