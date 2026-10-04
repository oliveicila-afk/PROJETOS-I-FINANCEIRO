import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { AdvBoxClient } from './integrations/advbox-client.js';
import { AdvBoxReviewService } from './domain/advbox-review-service.js';
import { GoogleDriveClient } from './integrations/google-drive-client.js';
import { getAdvBoxConfig, getGoogleDriveConfig } from './config.js';

async function formatDate(date: Date): Promise<string> {
  return date.toISOString().split('T')[0];
}

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  return { command, args: args.slice(1) };
}

async function main() {
  try {
    const { command, args } = parseArgs();

    if (!command) {
      console.log(`
Crossell Financeiro - CLI

Uso: npm run cli -- <comando> [opções]

Comandos:
  review-period <data-inicial> <data-final>
    Revisa demandas entre duas datas (YYYY-MM-DD)
    Exemplo: npm run cli -- review-period 2026-09-14 2026-09-17

  fabio-schedule
    Lista a agenda/tarefas do Fábio

  leticia-schedule
    Lista a agenda/tarefas da Leticia

  fabio-demands
    Lista as demandas ativas do Fábio

  leticia-demands
    Lista as demandas ativas da Leticia

  assign-to-fabio <id-processo>
    Atribui uma demanda para o Fábio

  assign-to-leticia <id-processo>
    Atribui uma demanda para a Leticia

  upload-drive <id-pasta> <caminho-arquivo> [nome] [mime-type]
    Envia um documento para uma pasta do Google Drive
      `);
      return;
    }

    switch (command) {
      case 'upload-drive': {
        if (args.length < 2) {
          console.error('❌ Erro: upload-drive requer ID da pasta e caminho do arquivo');
          process.exit(1);
        }

        const driveClient = new GoogleDriveClient(getGoogleDriveConfig());
        const filePath = args[1];
        const fileName = args[2] || basename(filePath);
        const mimeType = args[3] || 'application/octet-stream';
        const content = await readFile(filePath);
        const uploaded = await driveClient.uploadFile(args[0], fileName, content, mimeType);

        console.log(`✅ Arquivo enviado para o Drive: ${uploaded.name}`);
        console.log(`   ID: ${uploaded.id}`);
        console.log(`   Link: ${uploaded.webViewLink || '(indisponível)'}`);
        break;
      }

      case 'review-period': {
        const config = getAdvBoxConfig();
        const client = new AdvBoxClient(config);
        const reviewService = new AdvBoxReviewService(client);
        if (args.length < 2) {
          console.error('❌ Erro: review-period requer data inicial e final (YYYY-MM-DD)');
          process.exit(1);
        }
        const startDate = args[0];
        const endDate = args[1];
        console.log(`📋 Revisando demandas de ${startDate} a ${endDate}...`);
        const review = await reviewService.reviewDemandsByPeriod(startDate, endDate);
        const report = await reviewService.generateReviewReport(review);
        console.log(report);
        break;
      }

      case 'fabio-schedule': {
        const config = getAdvBoxConfig();
        const client = new AdvBoxClient(config);
        const reviewService = new AdvBoxReviewService(client);
        console.log('📅 Buscando agenda do Fábio...');
        const schedule = await reviewService.getFabioSchedule();
        console.log(`\n✅ ${schedule.length} tarefas encontradas:\n`);
        schedule.forEach((task) => {
          console.log(`  📌 ${task.title ?? task.task ?? 'Tarefa'}`);
          console.log(`     Status: ${task.status ?? 'não informado'}`);
          console.log(`     Conteúdo: ${task.content ?? task.notes ?? ''}`);
          if (task.due_date ?? task.date_deadline) {
            console.log(`     Vencimento: ${task.due_date ?? task.date_deadline}`);
          }
          console.log('');
        });
        break;
      }

      case 'leticia-schedule': {
        const config = getAdvBoxConfig();
        const client = new AdvBoxClient(config);
        const reviewService = new AdvBoxReviewService(client);
        console.log('📅 Buscando agenda da Leticia...');
        const schedule = await reviewService.getLeticiaSchedule();
        console.log(`\n✅ ${schedule.length} tarefas encontradas:\n`);
        schedule.forEach((task) => {
          console.log(`  📌 ${task.title ?? task.task ?? 'Tarefa'}`);
          console.log(`     Status: ${task.status ?? 'não informado'}`);
          console.log(`     Conteúdo: ${task.content ?? task.notes ?? ''}`);
          if (task.due_date ?? task.date_deadline) {
            console.log(`     Vencimento: ${task.due_date ?? task.date_deadline}`);
          }
          console.log('');
        });
        break;
      }

      case 'fabio-demands': {
        const config = getAdvBoxConfig();
        const client = new AdvBoxClient(config);
        const reviewService = new AdvBoxReviewService(client);
        console.log('📋 Buscando demandas ativas do Fábio...');
        const demands = await reviewService.getFabioActiveDemands();
        console.log(`\n✅ ${demands.length} demandas encontradas:\n`);
        demands.forEach((demand) => {
          console.log(`  🔹 ${demand.customer_name}`);
          console.log(`     Processo: ${demand.process_number}`);
          console.log(`     Estágio: ${demand.stage}`);
          console.log(`     Notas: ${demand.notes}`);
          console.log('');
        });
        break;
      }

      case 'leticia-demands': {
        const config = getAdvBoxConfig();
        const client = new AdvBoxClient(config);
        const reviewService = new AdvBoxReviewService(client);
        console.log('📋 Buscando demandas ativas da Leticia...');
        const demands = await reviewService.getLeticiaActiveDemands();
        console.log(`\n✅ ${demands.length} demandas encontradas:\n`);
        demands.forEach((demand) => {
          console.log(`  🔹 ${demand.customer_name}`);
          console.log(`     Processo: ${demand.process_number}`);
          console.log(`     Estágio: ${demand.stage}`);
          console.log(`     Notas: ${demand.notes}`);
          console.log('');
        });
        break;
      }

      case 'assign-to-fabio': {
        const config = getAdvBoxConfig();
        const client = new AdvBoxClient(config);
        const reviewService = new AdvBoxReviewService(client);
        if (args.length < 1) {
          console.error('❌ Erro: assign-to-fabio requer ID do processo');
          process.exit(1);
        }
        const lawsuitId = args[0];
        console.log(`⏳ Atribuindo demanda ${lawsuitId} para Fábio...`);
        const result = await reviewService.assignDemandToFabio(lawsuitId, lawsuitId);
        console.log(`✅ Demanda atribuída com sucesso!`);
        console.log(`   Cliente: ${result.customerName}`);
        console.log(`   Responsável: ${result.assignee}`);
        if (result.standardTaskNote) {
          console.log(`   Nota: ${result.standardTaskNote}`);
        }
        break;
      }

      case 'assign-to-leticia': {
        const config = getAdvBoxConfig();
        const client = new AdvBoxClient(config);
        const reviewService = new AdvBoxReviewService(client);
        if (args.length < 1) {
          console.error('❌ Erro: assign-to-leticia requer ID do processo');
          process.exit(1);
        }
        const lawsuitId = args[0];
        console.log(`⏳ Atribuindo demanda ${lawsuitId} para Leticia...`);
        const result = await reviewService.assignDemandToLeticia(lawsuitId, lawsuitId);
        console.log(`✅ Demanda atribuída com sucesso!`);
        console.log(`   Cliente: ${result.customerName}`);
        console.log(`   Responsável: ${result.assignee}`);
        if (result.standardTaskNote) {
          console.log(`   Nota: ${result.standardTaskNote}`);
        }
        break;
      }

      default:
        console.error(`❌ Comando desconhecido: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
