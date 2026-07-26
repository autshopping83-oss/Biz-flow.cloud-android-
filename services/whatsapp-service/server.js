/**
 * BizFlow - Servidor HTTP para Envio de PDF via WhatsApp Web
 *
 * Iniciar: node server.js
 * Enviar: curl -X POST http://localhost:3001/enviar \
 *   -H "Content-Type: application/json" \
 *   -d '{"numero":"258840000000","pdfBase64":"<base64>","nomeArquivo":"fatura.pdf"}'
 */

import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from 'pino';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import http from 'http';

// ─── CONFIG ────────────────────────────────────────────────────────────────────

const PORTA = process.env.PORT || 3001;
const DIRETORIO_SESSAO = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'sessao_whatsapp'
);

const logger = createLogger({ level: 'silent' });

// ─── ESTADO GLOBAL ─────────────────────────────────────────────────────────────

let sock = null;
let conectado = false;
let filaEnvio = []; // Fila de envios pendentes enquanto nao conectado

// ─── LER CORPO DO REQUEST ──────────────────────────────────────────────────────

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('JSON invalido')); }
    });
    req.on('error', reject);
  });
}

// ─── ENVIAR WHATSAPP ────────────────────────────────────────────────────────────

async function enviarWhatsApp(numero, pdfBuffer, nomeArquivo) {
  const sufixo = numero.includes('@s.whatsapp.net') ? numero : `${numero}@s.whatsapp.net`;
  await sock.sendMessage(sufixo, {
    document: pdfBuffer,
    mimetype: 'application/pdf',
    fileName: nomeArquivo || 'documento.pdf',
    caption: `Documento BizFlow - ${new Date().toLocaleDateString('pt-PT')}`,
  });
}

// ─── RESPONDER JSON ─────────────────────────────────────────────────────────────

function responder(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

// ─── PROCESSAR FILA ─────────────────────────────────────────────────────────────

async function processarFila() {
  while (filaEnvio.length > 0) {
    const item = filaEnvio.shift();
    try {
      await enviarWhatsApp(item.numero, item.buffer, item.nome);
      item.resolver({ sucesso: true, mensagem: 'Documento enviado com sucesso!' });
    } catch (erro) {
      item.rejeitar(erro);
    }
  }
}

// ─── CONECTAR WHATSAPP ──────────────────────────────────────────────────────────

async function conectarWhatsApp() {
  console.log(' Conectando ao WhatsApp...');
  const { state, saveCreds } = await useMultiFileAuthState(DIRETORIO_SESSAO);
  const sessaoExiste = existsSync(DIRETORIO_SESSAO) &&
    existsSync(path.join(DIRETORIO_SESSAO, 'creds.json'));

  sock = makeWASocket({
    version: [2, 3000, 1019120528],
    auth: state,
    logger,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ['BizFlow', 'Chrome', '1.0.0'],
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !sessaoExiste) {
      console.log('');
      console.log(' Escaneie o QR Code com o seu WhatsApp Web:');
      qrcode.generate(qr, { small: true });
      console.log('');
    }

    if (connection === 'open') {
      conectado = true;
      console.log(' WhatsApp conectado!');
      await processarFila();
    }

    if (connection === 'close') {
      conectado = false;
      const motivo = lastDisconnect?.error?.output?.statusCode;
      if (motivo === DisconnectReason.loggedOut) {
        console.log(' Sessao expirada. Reconectando para novo QR...');
        sock?.ev?.removeAllListeners('creds.update');
      }
      setTimeout(conectarWhatsApp, 5000);
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

// ─── SERVIDOR HTTP ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // GET / — health check / status
  if (req.method === 'GET' && req.url === '/') {
    return responder(res, 200, {
      status: conectado ? 'conectado' : 'a_conectar',
      servico: 'BizFlow WhatsApp Service',
      fila: filaEnvio.length,
    });
  }

  // GET /qr — mostrar QR code no terminal (se nao conectado)
  if (req.method === 'GET' && req.url === '/qr') {
    return responder(res, 200, { mensagem: 'QR code exibido no terminal do servidor.' });
  }

  // POST /enviar — enviar documento
  if (req.method === 'POST' && req.url === '/enviar') {
    try {
      const body = await lerCorpo(req);
      const { numero, pdfBase64, nomeArquivo } = body;

      if (!numero || !pdfBase64) {
        return responder(res, 400, { sucesso: false, erro: 'Campos obrigatorios: numero, pdfBase64' });
      }

      const buffer = Buffer.from(pdfBase64, 'base64');

      if (conectado && sock) {
        await enviarWhatsApp(numero, buffer, nomeArquivo);
        return responder(res, 200, { sucesso: true, mensagem: 'Documento enviado!' });
      } else {
        // Colocar na fila — o servidor enviara quando conectar
        return new Promise((resolve) => {
          filaEnvio.push({
            numero, buffer, nome: nomeArquivo || 'documento.pdf',
            resolver: (result) => { responder(res, 200, result); resolve(); },
            rejeitar: (erro) => { responder(res, 500, { sucesso: false, erro: erro.message }); resolve(); },
          });
          responder(res, 202, { sucesso: true, mensagem: 'Na fila. WhatsApp a conectar...', fila: filaEnvio.length });
          resolve();
        });
      }
    } catch (erro) {
      return responder(res, 500, { sucesso: false, erro: erro.message });
    }
  }

  // 404
  responder(res, 404, { erro: 'Rota nao encontrada' });
});

// ─── INICIAR ────────────────────────────────────────────────────────────────────

server.listen(PORTA, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     BizFlow - Servico WhatsApp Web              ║');
  console.log(`║     http://localhost:${PORTA}                      ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  conectarWhatsApp();
});
