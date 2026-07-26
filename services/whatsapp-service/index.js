/**
 * BizFlow - Envio de PDF via WhatsApp Web
 *
 * Script CLI que conecta ao WhatsApp Web via Baileys e envia um PDF.
 *
 * Uso: node index.js
 *
 * Configuracao via variaveis de ambiente:
 *   WHATSAPP_NUMERO  — numero destino (ex: 258840636794)
 *   WHATSAPP_PDF     — caminho do ficheiro PDF (ex: ./documento.pdf)
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { createLogger } from 'pino';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

// ─── CONFIGURACAO ──────────────────────────────────────────────────────────────

const NUMERO_DESTINO = process.env.WHATSAPP_NUMERO || '258840636794';
const CAMINHO_PDF = process.env.WHATSAPP_PDF || './documento.pdf';

const NUMERO_COM_SUFIXO = NUMERO_DESTINO.includes('@s.whatsapp.net')
  ? NUMERO_DESTINO
  : `${NUMERO_DESTINO}@s.whatsapp.net`;

const DIRETORIO_SESSAO = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'sessao_whatsapp'
);

const NOME_ARQUIVO = path.basename(CAMINHO_PDF);
const PREFIXO_NUMERO = '258'; // Codigo de Mocambique — ajustavel

// ─── READLINE PARA INPUT DO UTILIZADOR ─────────────────────────────────────────

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const perguntar = (pergunta) => new Promise((r) => rl.question(pergunta, r));

// ─── LOGGER SILENCIOSO ─────────────────────────────────────────────────────────

const logger = createLogger({ level: 'silent' });

// ─── FUNCAO PRINCIPAL ──────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║        BizFlow - Envio WhatsApp Web             ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  const pdfPath = path.resolve(CAMINHO_PDF);
  if (!existsSync(pdfPath)) {
    console.error(` ERRO: Ficheiro nao encontrado: ${pdfPath}`);
    process.exit(1);
  }
  const pdfBuffer = readFileSync(pdfPath);
  console.log(` PDF carregado: ${NOME_ARQUIVO} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(` Destino: ${NUMERO_COM_SUFIXO}`);
  console.log('');

  // ─── SESSAO ───────────────────────────────────────────────────────────────
  const { state, saveCreds } = await useMultiFileAuthState(DIRETORIO_SESSAO);
  const sessaoExiste = existsSync(DIRETORIO_SESSAO) &&
    existsSync(path.join(DIRETORIO_SESSAO, 'creds.json'));

  let jaEnviou = false;
  let pairingCodeRequested = false;

  // ─── SOCKET ───────────────────────────────────────────────────────────────
  const sock = makeWASocket({
    version: [2, 3000, 1019120528],
    auth: state,
    logger,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ['BizFlow', 'Chrome', '1.0.0'],
  });

  // ─── EVENTO: CONEXAO ─────────────────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR Code gerado — oferecer tambem codigo de emparelhamento
    if (qr && !sessaoExiste && !pairingCodeRequested) {
      pairingCodeRequested = true;

      console.log('═ OPCAO 1 — Escaneie o QR Code abaixo com o seu WhatsApp:');
      console.log('');
      qrcode.generate(qr, { small: true });
      console.log('');

      console.log('═ OPCAO 2 — Use codigo de emparelhamento (copiar e colar):');
      console.log('');
      console.log(' No WhatsApp: Aparelhos Ligados > Conectar um dispositivo >');
      console.log(' Conectar com codigo numerico');
      console.log('');

      // Pedir numero do telefone para gerar codigo de emparelhamento
      const telemovel = await perguntar(
        ` Informe o seu numero (ex: ${PREFIXO_NUMERO}840000000): `
      );
      const numeroLimpo = telemovel.replace(/\D/g, '');

      if (numeroLimpo.length >= 10) {
        try {
          const codigo = await sock.requestPairingCode(numeroLimpo);
          const codigoFormatado = codigo.match(/.{1,4}/g)?.join('-') || codigo;
          console.log('');
          console.log('╔══════════════════════════════════════════════════╗');
          console.log('║  Codigo de emparelhamento (copie abaixo):       ║');
          console.log('║                                                ║');
          console.log(`║       ${codigoFormatado.padStart(20, ' ')}         ║`);
          console.log('║                                                ║');
          console.log('╚══════════════════════════════════════════════════╝');
          console.log('');
          console.log(' Digite o codigo no WhatsApp > Aparelhos Ligados');
          console.log(' > Conectar um dispositivo > Conectar com codigo');
          console.log('');
        } catch (erro) {
          console.error(` Erro ao gerar codigo: ${erro.message}`);
        }
      } else {
        console.log(' Numero invalido. Use apenas o QR Code acima.');
      }
      return;
    }

    // Conectado com sucesso
    if (connection === 'open') {
      console.log(' Conectado com sucesso ao WhatsApp!');
      console.log('');
      await enviarDocumento(sock);
    }

    // Conexao fechada
    if (connection === 'close') {
      const motivo = lastDisconnect?.error?.output?.statusCode;
      if (motivo === DisconnectReason.loggedOut) {
        console.error(' Sessao expirada/excluida. Execute novamente.');
        process.exit(1);
      }
      if (!jaEnviou) {
        console.error(' Conexao fechada antes do envio.');
        process.exit(1);
      }
    }
  });

  // ─── EVENTO: MENSAGENS ──────────────────────────────────────────────────
  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (msg.key?.fromMe && msg.message?.documentMessage) {
        if (!jaEnviou) {
          jaEnviou = true;
          const nomeDoc = msg.message.documentMessage.fileName || NOME_ARQUIVO;
          console.log(` Documento enviado com sucesso: "${nomeDoc}"`);
          setTimeout(() => {
            rl.close();
            console.log(' Processo concluido.');
            process.exit(0);
          }, 1000);
        }
      }
    }
  });

  // ─── FUNCAO DE ENVIO ─────────────────────────────────────────────────────
  async function enviarDocumento(socket) {
    try {
      console.log(' Enviando documento...');
      await socket.sendMessage(NUMERO_COM_SUFIXO, {
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: NOME_ARQUIVO,
        caption: `Documento gerado pelo BizFlow - ${new Date().toLocaleDateString('pt-PT')}`,
      });
      console.log(' Documento enviado ao servidor WhatsApp. Aguardando confirmacao...');
    } catch (erro) {
      console.error(' Erro ao enviar documento:', erro.message);
      process.exit(1);
    }
  }

  // ─── SALVAR CREDENCIAIS ──────────────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);
}

// ─── EXECUTAR ──────────────────────────────────────────────────────────────────

main().catch((erro) => {
  if (rl) rl.close();
  console.error(' Erro fatal:', erro.message);
  process.exit(1);
});
