/**
 * BizFlow - Servico de Envio de Email via Gmail OAuth2
 *
 * Fluxo OAuth2 Three-Legged:
 *   1. GET /auth/url?userId=xxx  → Gera URL de consentimento Google
 *   2. Utilizador autoriza → Google redireciona para /auth/callback?code=...&state=userId
 *   3. POST /enviar              → Envia email com PDF anexo
 *
 * Variaveis de ambiente:
 *   PORT                 — Porta do servidor (default 3002)
 *   GOOGLE_CLIENT_ID     — ID do cliente OAuth2 (Google Cloud Console)
 *   GOOGLE_CLIENT_SECRET — Secret do cliente OAuth2
 *   GOOGLE_REDIRECT_URI  — URL de callback (ex: http://localhost:3002/auth/callback)
 *   DB_HOST / DB_NAME / DB_USER / DB_PASS — Conexao a base de dados PostgreSQL
 */

import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import pg from 'pg';

// ─── CONFIGURACAO ──────────────────────────────────────────────────────────────

const PORTA = process.env.PORT || 3002;

const OAUTH2_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3002/auth/callback',
};

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'bizflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
};

// Escopo estrito: apenas envio, sem leitura
const ESCOPO_GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';

// ─── BASE DE DADOS (POOL) ──────────────────────────────────────────────────────

const pool = new pg.Pool(DB_CONFIG);

pool.on('error', (erro) => {
  console.error(' Erro no pool de BD:', erro.message);
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_tokens (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'gmail',
        refresh_token TEXT NOT NULL,
        email TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, provider)
      );
    `);
    console.log(' Tabela user_tokens verificada/criada.');
  } finally {
    client.release();
  }
}

// ─── CLIENTE OAuth2 ────────────────────────────────────────────────────────────

function criarClienteOAuth2(refreshToken) {
  const cliente = new google.auth.OAuth2(
    OAUTH2_CONFIG.clientId,
    OAUTH2_CONFIG.clientSecret,
    OAUTH2_CONFIG.redirectUri
  );
  if (refreshToken) {
    cliente.setCredentials({ refresh_token: refreshToken });
  }
  return cliente;
}

// ─── PARTE A: GERAR URL DE AUTENTICACAO ────────────────────────────────────────

/**
 * Gera a URL de consentimento da Google para o usuario autorizar o envio de emails.
 * @param {string} userId - ID do utilizador na plataforma (passado como 'state')
 * @returns {string} URL de redirecionamento para a Google
 */
function gerarAuthUrl(userId) {
  const cliente = criarClienteOAuth2();
  return cliente.generateAuthUrl({
    access_type: 'offline',        // Obrigatorio para receber refresh_token
    prompt: 'consent',             // Forca re-exibicao do consentimento
    scope: [ESCOPO_GMAIL_SEND],    // Escopo estrito: apenas enviar
    state: userId,                 // Passa o ID do user para o callback
  });
}

// ─── PARTE B: CALLBACK — TROCA CODE POR TOKENS ─────────────────────────────────

/**
 * Troca o codigo de autorizacao por access_token e refresh_token.
 * Guarda o refresh_token na BD associado ao userId.
 * @param {string} code - Codigo temporario vindo do Google
 * @param {string} userId - ID do utilizador (recebido via 'state')
 * @returns {Promise<object>} tokens
 */
async function trocarCodePorTokens(code, userId) {
  const cliente = criarClienteOAuth2();
  const { tokens } = await cliente.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      'Nenhum refresh_token recebido. Certifique-se de que o utilizador ' +
      'revogou o acesso anterior ou use prompt=consent.'
    );
  }

  // Guardar refresh_token na BD (upsert)
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO user_tokens (user_id, provider, refresh_token, email)
       VALUES ($1, 'gmail', $2, $3)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET refresh_token = EXCLUDED.refresh_token,
                     email = EXCLUDED.email,
                     updated_at = now()`,
      [userId, tokens.refresh_token, tokens.email || null]
    );
  } finally {
    client.release();
  }

  return tokens;
}

// ─── PARTE C: ENVIO DE EMAIL COM PDF ───────────────────────────────────────────

/**
 * Envia um email com PDF anexo usando a conta Gmail do utilizador autenticado.
 *
 * @param {object} params
 * @param {string} params.userId - ID do utilizador na plataforma
 * @param {string} params.destinatario - Email de destino
 * @param {string} params.assunto - Assunto do email
 * @param {string} params.corpoHtml - Corpo do email em HTML (editavel pelo user)
 * @param {Buffer} params.pdfBuffer - Buffer do PDF a anexar
 * @param {string} params.pdfNome - Nome do ficheiro PDF (ex: 'FAT-0001.pdf')
 * @param {string} [params.remetenteNome] - Nome visivel do remetente
 * @returns {Promise<object>} { sucesso, mensagemId }
 */
async function enviarEmail({
  userId,
  destinatario,
  assunto,
  corpoHtml,
  pdfBuffer,
  pdfNome,
  remetenteNome,
}) {
  // 1. Recuperar refresh_token da BD
  const client = await pool.connect();
  let refreshToken, emailUtilizador;
  try {
    const result = await client.query(
      `SELECT refresh_token, email FROM user_tokens
       WHERE user_id = $1 AND provider = 'gmail'`,
      [userId]
    );
    if (result.rows.length === 0) {
      throw new Error(
        'Utilizador nao conectou o Gmail. Use o botao "Conectar Gmail" primeiro.'
      );
    }
    refreshToken = result.rows[0].refresh_token;
    emailUtilizador = result.rows[0].email;
  } finally {
    client.release();
  }

  // 2. Instanciar cliente OAuth2 com refresh_token
  const oauth2Client = criarClienteOAuth2(refreshToken);

  // 3. Obter access_token (googleapis faz refresh automatico se expirado)
  const accessTokenResponse = await oauth2Client.getAccessToken();
  const accessToken = accessTokenResponse?.token;
  if (!accessToken) {
    throw new Error('Falha ao obter access_token. Token pode estar expirado.');
  }

  // 4. Configurar transporte nodemailer com xoauth2
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: emailUtilizador,
      clientId: OAUTH2_CONFIG.clientId,
      clientSecret: OAUTH2_CONFIG.clientSecret,
      refreshToken,
      accessToken,
    },
  });

  // 5. Montar e enviar a mensagem
  const info = await transporter.sendMail({
    from: remetenteNome
      ? `"${remetenteNome}" <${emailUtilizador}>`
      : emailUtilizador,
    to: destinatario,
    subject: assunto,
    html: corpoHtml,
    attachments: [
      {
        filename: pdfNome || 'documento.pdf',
        content: pdfBuffer,   // Buffer em memoria, sem ficheiro temporario
        contentType: 'application/pdf',
      },
    ],
  });

  return { sucesso: true, mensagemId: info.messageId };
}

// ─── SERVIDOR HTTP ─────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Para receber PDFs em base64

// Health check
app.get('/', (req, res) => {
  res.json({
    servico: 'BizFlow Email Service (Gmail OAuth2)',
    status: 'online',
  });
});

// ─── ENDPOINT: GERAR URL DE AUTENTICACAO ───────────────────────────────────────
// GET /auth/url?userId=abc123
app.get('/auth/url', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Parametro obrigatorio: userId',
    });
  }

  const authUrl = gerarAuthUrl(String(userId));
  res.json({ sucesso: true, url: authUrl });
});

// ─── ENDPOINT: CALLBACK OAUTH2 ─────────────────────────────────────────────────
// GET /auth/callback?code=...&state=userId
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send('Parametros code e state sao obrigatorios.');
  }

  try {
    await trocarCodePorTokens(String(code), String(state));

    // Redirecionar de volta para a plataforma com mensagem de sucesso
    res.redirect(`${process.env.APP_URL || 'https://biz-flow.cloud'}?email=conectado`);
  } catch (erro) {
    console.error(' Erro no callback OAuth2:', erro.message);
    res.redirect(`${process.env.APP_URL || 'https://biz-flow.cloud'}?email=erro&motivo=${encodeURIComponent(erro.message)}`);
  }
});

// ─── ENDPOINT: STATUS DA CONEXAO ───────────────────────────────────────────────
// GET /auth/status?userId=abc123
app.get('/auth/status', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ sucesso: false, erro: 'userId obrigatorio' });

  try {
    const result = await pool.query(
      'SELECT email, created_at FROM user_tokens WHERE user_id = $1 AND provider = $2',
      [String(userId), 'gmail']
    );
    if (result.rows.length > 0) {
      res.json({ sucesso: true, conectado: true, email: result.rows[0].email });
    } else {
      res.json({ sucesso: true, conectado: false });
    }
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

// ─── ENDPOINT: ENVIAR EMAIL ────────────────────────────────────────────────────
// POST /enviar
app.post('/enviar', async (req, res) => {
  const {
    userId,
    destinatario,
    assunto,
    corpoHtml,
    pdfBase64,
    pdfNome,
    remetenteNome,
  } = req.body;

  // Validacoes
  if (!userId) return res.status(400).json({ sucesso: false, erro: 'userId obrigatorio' });
  if (!destinatario) return res.status(400).json({ sucesso: false, erro: 'destinatario obrigatorio' });
  if (!assunto) return res.status(400).json({ sucesso: false, erro: 'assunto obrigatorio' });
  if (!pdfBase64) return res.status(400).json({ sucesso: false, erro: 'pdfBase64 obrigatorio' });

  try {
    // Converter base64 para Buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    const resultado = await enviarEmail({
      userId,
      destinatario,
      assunto,
      corpoHtml: corpoHtml || `<p>Documento em anexo.</p>`,
      pdfBuffer,
      pdfNome: pdfNome || 'documento.pdf',
      remetenteNome,
    });

    res.json(resultado);
  } catch (erro) {
    console.error(' Erro ao enviar email:', erro.message);

    // Tratamento especifico para token expirado
    if (erro.message.includes('Token has been expired') || erro.message.includes('invalid_grant')) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Token expirado ou invalido. O utilizador precisa conectar o Gmail novamente.',
        codigo: 'TOKEN_EXPIRED',
      });
    }

    res.status(500).json({
      sucesso: false,
      erro: erro.message,
    });
  }
});

// ─── INICIAR ────────────────────────────────────────────────────────────────────

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

iniciar();
