/**
 * BizFlow - Servico de Envio de Email via Gmail OAuth2
 *
 * Iniciar: node server.js
 */
import express from 'express';
import cors from 'cors';
import { PORTA } from './src/config.js';
import { initDatabase, encerrarPool } from './src/database.js';
import router from './src/routes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(router);

app.get('/', (req, res) => {
  res.json({ servico: 'BizFlow Email Service (Gmail OAuth2)', status: 'online' });
});

async function iniciar() {
  try {
    await initDatabase();
    app.listen(PORTA, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════╗');
      console.log('║     BizFlow - Servico de Email (Gmail OAuth2)   ║');
      console.log(`║     http://localhost:${PORTA}                      ║`);
      console.log('╚══════════════════════════════════════════════════╝');
      console.log('');
      console.log(' Endpoints:');
      console.log(`   GET  /auth/url?userId=xxx   — URL de autenticacao`);
      console.log(`   GET  /auth/callback          — Callback OAuth2`);
      console.log(`   GET  /auth/status?userId=xxx — Status da conexao`);
      console.log(`   POST /enviar                 — Enviar email com PDF`);
      console.log('');
    });
  } catch (erro) {
    console.error(' Erro ao iniciar servico:', erro.message);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log(' SIGTERM recebido. A encerrar...');
  await encerrarPool();
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log(' SIGINT recebido. A encerrar...');
  await encerrarPool();
  process.exit(0);
});

iniciar();
