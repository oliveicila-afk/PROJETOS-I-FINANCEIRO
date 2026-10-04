import { GoogleDriveClient } from './src/integrations/google-drive-client.js';
import { getGoogleDriveConfig } from './src/config.js';

async function findSuellen() {
  try {
    console.log('🔍 Procurando por Suellen no Google Drive...\n');

    const config = getGoogleDriveConfig();
    const client = new GoogleDriveClient(config);

    // Buscar por nome
    console.log('📁 Buscando pasta por nome: Suellen...');
    const files = await client.searchFilesByCustomer('Suellen');

    if (files.length === 0) {
      console.log('❌ Nenhuma pasta encontrada com nome "Suellen"');
      return;
    }

    console.log(`✅ Encontradas ${files.length} pasta(s):\n`);

    for (const file of files) {
      console.log(`📄 ${file.name}`);
      console.log(`   ID: ${file.id}`);
      console.log(`   Link: ${file.webViewLink}`);
      console.log(`   Criado: ${new Date(file.createdTime).toLocaleDateString('pt-BR')}`);
      console.log('');
    }

    // Buscar documentos bancários
    if (files.length > 0) {
      console.log('\n🔎 Procurando documentos bancários...');
      const bankDocs = await client.searchBankDocuments('Suellen');

      if (bankDocs.length > 0) {
        console.log(`✅ Encontrados ${bankDocs.length} documento(s) bancário(s):\n`);
        for (const doc of bankDocs) {
          console.log(`📄 ${doc.name}`);
          console.log(`   ID: ${doc.id}`);
          console.log(`   Link: ${doc.webViewLink}`);
          console.log('');
        }
      } else {
        console.log('❌ Nenhum documento bancário encontrado');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao procurar:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

findSuellen();
