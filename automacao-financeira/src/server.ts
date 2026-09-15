import { createServer } from 'node:http';
import { config } from './config.js';

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ status: 'ok', service: 'automacao-financeira' }));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: 'Rota nao encontrada.' }));
});

server.listen(config.port, () => {
  console.log(`Automacao financeira ouvindo na porta ${config.port}.`);
});